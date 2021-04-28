import { Inspector, URLsMatchingSet, Config, IHttpClient, HttpClientFailure, AxiosHttpClient } from "../src/inspector"
import { assert } from "chai"
import "mocha"
import { ConsoleReporter, JUnitReporter, IReporter } from "../src/report"
import { ResultItem, CheckStatus, Result } from "../src/result"
import intercept from "intercept-stdout"

class MockHttpClient implements IHttpClient {

	private attemptsMap = new Map<string, number>()

	// Map<url, [response, timeout, failure, code, retries]>
	constructor(readonly map: Map<string, [string[], boolean, boolean, number, number]>) { }

	async request(get: boolean, url: string, _: string): Promise<string> {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const [urls, timeout, failure, code, retries] = this.map.get(url)!

		if (retries > 0) {
			if (this.attemptsMap.has(url)) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				if (this.attemptsMap.get(url)! < retries) {
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					this.attemptsMap.set(url, this.attemptsMap.get(url)! + 1)
					throw new HttpClientFailure(true, -1)
				}
			} else {
				this.attemptsMap.set(url, 0)
				throw new HttpClientFailure(true, -1)
			}
		}

		if (timeout) {
			throw new HttpClientFailure(true, -1)
		} else if (failure) {
			throw new HttpClientFailure(false, -1)
		} else if (code != -1) {
			throw new HttpClientFailure(false, code)
		} else if (!get) {
			return ""
		} else {
			return "<html>" + urls.map(url => `<a href="https://${url}">link</a>`).join("") + "</html>"
		}
	}
}

class MockReporter implements IReporter {
	process(pages: Map<string, ResultItem[]>): Map<string, ResultItem[]> {
		return pages
	}
}

function toURL(url: string, path = "") {
	return new URL(`https://${url}/${path}`).href
}

function stripEffects(text: string) {
	// eslint-disable-next-line no-control-regex
	return text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "")
}

function assertEqualResults(expected: Map<string, ResultItem[]>, actual: Map<string, ResultItem[]>) {

	for (const [expectedURL, expectedChecks] of expected) {
		assert(actual.has(expectedURL))
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const actualChecks = actual.get(expectedURL)!
		assert(expectedChecks.length == actualChecks.length)
		for (const expectedCheck of expectedChecks) {
			const actualCheck = actualChecks.find(c => c.url === expectedCheck.url)
			assert(actualCheck)
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			assert(expectedCheck.status == actualCheck!.status)
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			assert(actualCheck!.message ? actualCheck!.message!.includes(expectedCheck.message!) : !expectedCheck.message)
		}
	}

}

const original = "original.com"
const external = "external.com"

// url -> [urls, timeout, failure, code, retries]
const map = new Map<string, [string[], boolean, boolean, number, number]>([
	[toURL(original), [
		[
			`${original}/success`,
			`${original}/not-found#anchor`,
			`${original}/timeout`,
			`${original}/failure`,
			`${original}/retried`,
			`${external}/1`,
			`${external}/to-skip`,
			original
		], false, false, -1, 0]
	],
	[toURL(original, "success"), [[`${original}/recursive`, `${external}/2`], false, false, -1, 0]],
	[toURL(original, "not-found"), [[], false, false, 404, 0]],
	[toURL(original, "timeout"), [[], true, false, -1, 0]],
	[toURL(original, "failure"), [[], false, true, -1, 0]],
	[toURL(original, "retried"), [[], false, false, -1, 2]],
	[toURL(original, "recursive"), [[], false, false, -1, 0]],
	[toURL(external, "1"), [[], false, false, -1, 0]],
	[toURL(external, "2"), [[], false, false, -1, 0]]
])
const expectedNonRecursive = new Map<string, ResultItem[]>([
	["original request", [{ url: toURL(original), status: CheckStatus.OK }]],
	[toURL(original), [
		{ url: toURL(original, "success"), status: CheckStatus.OK },
		{ url: toURL(original, "not-found"), status: CheckStatus.NonSuccessCode, message: `${404}` },
		{ url: toURL(original, "timeout"), status: CheckStatus.Timeout },
		{ url: toURL(original, "failure"), status: CheckStatus.GenericError },
		{ url: toURL(original, "retried"), status: CheckStatus.Retried, message: `${2}` },
		{ url: toURL(original), status: CheckStatus.Skipped },
		{ url: toURL(external, "1"), status: CheckStatus.OK },
		{ url: toURL(external, "to-skip"), status: CheckStatus.Skipped }
	]]
])

describe("Axios web server", async () => {

	const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1 Safari/605.1.15"

	it("OK", async () => {
		await new AxiosHttpClient(5000, []).request(false, "https://dbogatov.org", ua)
	})

	it("timeout", async () => {
		try {
			await new AxiosHttpClient(5, []).request(false, "https://dbogatov.org", ua)
		} catch (exception) {
			const error: HttpClientFailure = exception
			assert(error.timeout)
		}
	})

	it("404", async () => {
		try {
			await new AxiosHttpClient(2000, []).request(false, "https://dbogatov.org/not-found-123", ua)
		} catch (exception) {
			const error: HttpClientFailure = exception
			assert(error.code == 404)
		}
	})

	it("generic", async () => {
		try {
			await new AxiosHttpClient(1000, []).request(true, "ftp://bad-url-54234534.com", ua)
		} catch (exception) {
			const error: HttpClientFailure = exception
			assert(!error.timeout)
			assert(error.code == -1)
		}
	})

})

describe("process mock URL", function () {

	([true, false] as boolean[]).forEach(recursive => {

		const httpClient = new MockHttpClient(map)

		it(`processes ${recursive ? "" : "non-"}recursive`, async () => {
			const config = new Config()
			config.disablePrint = true
			config.skipURLs = ["to-skip"]
			const inspector = new Inspector(
				new URLsMatchingSet(),
				config,
				httpClient
			)
			const unhook_intercept = intercept(_ => { return "" })

			const result = await inspector.processURL([new URL("https://original.com")], recursive, false)

			unhook_intercept()

			const actual = result.report(new MockReporter()) as Map<string, ResultItem[]>
			const expected = new Map(expectedNonRecursive)

			if (recursive) {
				expected.set(
					toURL(original, "success"),
					[
						{ url: toURL(original, "recursive"), status: CheckStatus.OK },
						{ url: toURL(external, "2"), status: CheckStatus.OK }
					]
				)
			}

			assertEqualResults(expected, actual)
			assert(!result.success())
		})
	})

	describe("reporters", function () {

		it("console", () => {

			let log = ""
			const unhook_intercept = intercept(line => {
				log += stripEffects(line)
				return ""
			})

			const result = new Result(true, true)
			result.set(expectedNonRecursive)
			result.report(new ConsoleReporter())

			unhook_intercept()

			const lines = log.split(/\r?\n/)

			for (const [expectedURL, expectedChecks] of expectedNonRecursive) {
				assert(lines.find(l => l.startsWith(expectedURL)))

				for (const expectedCheck of expectedChecks) {
					if (expectedCheck.status == CheckStatus.Skipped) {
						continue
					}
					const check = lines.find(l => l.includes("\t") && l.includes(expectedCheck.url + " "))
					assert(check, `${expectedCheck.url} not found`)
					assert(
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						check!.includes(expectedCheck.status == CheckStatus.NonSuccessCode || expectedCheck.status == CheckStatus.GenericError ? "BROKEN" : expectedCheck.status),
						`${expectedCheck.url}: status (${expectedCheck.status}) not found in "${check}"`
					)
					if (expectedCheck.message) {
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						assert(check!.includes(expectedCheck.message))
					}
				}
			}
		})

		it("junit", () => {

			let log = ""
			const unhook_intercept = intercept(line => {
				log += line
				return ""
			})

			const result = new Result(true, true)
			result.set(expectedNonRecursive)
			result.report(new JUnitReporter(false))

			unhook_intercept()

			result.report(new JUnitReporter())

			const lines = log.split(/\r?\n/)

			for (const [expectedURL, expectedChecks] of expectedNonRecursive) {
				assert(lines.find(l => l.includes("testsuite") && l.includes(expectedURL)))

				for (const expectedCheck of expectedChecks) {
					assert(lines.find(l => l.includes("testcase") && l.includes(expectedURL) && l.includes(expectedCheck.url)))
				}
			}
		})
	})
})

describe("process real URL", async () => {
	const config = new Config()
	config.disablePrint = true
	const inspector = new Inspector(
		new URLsMatchingSet(),
		config,
		new AxiosHttpClient(config.timeout, config.acceptedCodes)
	)
	await inspector.processURL([new URL("https://dbogatov.org")], false, false)
})

describe("process URL single-threaded", async () => {
	const config = new Config()
	config.disablePrint = true
	config.singleThreaded = true
	const inspector = new Inspector(
		new URLsMatchingSet(),
		config,
		new AxiosHttpClient(config.timeout, config.acceptedCodes)
	)
	await inspector.processURL([new URL("https://dbogatov.org")], false, false)
})

describe("process multiple URLs", async () => {
	const config = new Config()
	config.disablePrint = true
	const inspector = new Inspector(
		new URLsMatchingSet(),
		config,
		new AxiosHttpClient(config.timeout, config.acceptedCodes)
	)
	await inspector.processURL([new URL("https://dbogatov.org"), new URL("https://bogatova.org")], false, false)
})

describe("result", () => {

	it("ignores skipped", () => {
		const result = new Result(true, true)
		result.add({ status: CheckStatus.Skipped, url: "skip" })
		result.add(new ResultItem())
		assert(result.count() == 1)
	})

	it("print progress", () => {
		const result = new Result(true, false)

		let log = ""
		const unhook_intercept = intercept(line => {
			log += line
			return ""
		})

		result.add({ status: CheckStatus.GenericError, url: "" })
		for (let index = 0; index < 120; index++) {
			result.add({ status: CheckStatus.OK, url: `${index}` })
		}

		unhook_intercept()

		const lines = log.split(/\r?\n/)

		assert(result.count() == 121)
		assert(lines.length == 2)
		assert(lines[0].startsWith("x"))
		assert(lines[0].length == 80)
	})

})
