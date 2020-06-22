import * as parser from "htmlparser2"
import axios, { AxiosError } from "axios"

export async function processURL(originalUrl: URL, recursive: boolean, config: Config, matcher: URLsMatchingSet): Promise<Result> {

	let result = new Result();
	let urlsToCheck: [string, string?][] = [[originalUrl.href, undefined]]

	let processingRoutine = async (url: string, parent?: string) => {

		try {
			url = parent ? new URL(url, parent).href : url

			if (result.isChecked(url) || config.ignoredExtensions.some(ext => url.startsWith(ext + ":"))) {
				result.add({ url: url, status: CheckStatus.Skipped }, parent)
			} else {

				const response = await axios.get(parent ? new URL(url, parent).href : url, { timeout: config.timeout })
				let html = response.data as string

				if (recursive && originalUrl.host == new URL(url).host) {

					let discoveredURLs = extractURLs(html, matcher)

					for (const discovered of discoveredURLs) {
						urlsToCheck.push([discovered, url])
					}
				}

				result.add({ url: url, status: CheckStatus.OK }, parent)
			}

		} catch (exception) {
			const error: AxiosError = exception;

			if (!error.response) {
				result.add({ url: url, status: CheckStatus.GenericError }, parent)
			} else {
				if (config.acceptedCodes.some(code => code == error.response?.status)) {
					result.add({ url: url, status: CheckStatus.OK }, parent)
				} else {
					result.add({ url: url, status: CheckStatus.NonSuccessCode, message: `${error.response.status}` }, parent)
				}
			}
		}

	}

	let promises: Promise<void>[] = []

	while (urlsToCheck.length > 0) {

		let [url, parent] = urlsToCheck.pop()!

		promises.push(processingRoutine(url, parent))

		if (urlsToCheck.length == 0) {
			await Promise.all(promises)
		}
	}

	return result
}

export function extractURLs(html: string, matcher: URLsMatchingSet): Set<string> {

	let urls = new Set<string>();

	let parserInstance = new parser.Parser(
		{
			onopentag(name, attributes) {
				const match = matcher.match(name, attributes);
				if (match && match !== "" && !match.startsWith("#")) {
					urls.add(match)
				}
			}
		},
		{ decodeEntities: true }
	);
	parserInstance.write(html)
	parserInstance.end()

	return urls
}

export class Config {
	public acceptedCodes: number[] = [999]
	public timeout: number = 2000
	public ignoredExtensions: string[] = ["mailto", "tel"]
}

export class Result {
	private pages = new Map<string, ResultItem[]>()
	private checkedUrls = new Set<string>()

	public add(completedCheck: ResultItem, parent: string = "original request") {
		// console.log(`${completedCheck.url} : ${completedCheck.status} ${completedCheck.message ? completedCheck.message : ""}`) // TODO

		if (this.pages.has(parent)) {
			this.pages.get(parent)?.push(completedCheck)
		} else {
			this.pages.set(parent, [completedCheck])
		}
		this.checkedUrls.add(completedCheck.url)
	}

	public isChecked(url: string): boolean {
		return this.checkedUrls.has(url)
	}

	public count(): number {
		let count = 0
		for (const page of this.pages.entries()) {
			count += page[1].length
		}
		return count
	}

	public report(): void { // TODO

		let allSkipped = 0
		let allOks = 0
		let allBroken = 0

		for (const page of this.pages.entries()) {
			console.log(page[0])

			let skipped = 0
			let oks = 0
			let broken = 0

			for (const check of page[1]) {
				switch (check.status) {
					case CheckStatus.OK:
						oks++
						break
					case CheckStatus.NonSuccessCode:
					case CheckStatus.GenericError:
					case CheckStatus.Timeout:
						broken++
						break
					case CheckStatus.Skipped:
						skipped++
						break
				}

				if (check.status != CheckStatus.Skipped) {
					console.log(`\t${check.status} : ${check.url}`)
				}
			}
			console.log(`\tOK: ${oks}, skipped: ${skipped}, broken: ${broken}`)
			allOks += oks
			allSkipped += skipped
			allBroken += broken
		}
		console.log(`OK: ${allOks}, skipped: ${allSkipped}, broken: ${allBroken}`)
	}
}

export class ResultItem {
	public url = ""
	public status = CheckStatus.OK
	public message?: string
}

export enum CheckStatus {
	OK = "OK",
	Skipped = "SKIP",
	Timeout = "TIMEOUT",
	NonSuccessCode = "ERROR CODE",
	GenericError = "UNKNOWN"
}

export enum URLMatchingRule {
	AHRef = "<a href>",
	ScriptSrc = "<script src>",
	LinkHref = "<link href>",
	ImgSrc = "<img src>"
}

export class URLsMatchingSet {
	private rules: URLMatchingRule[]

	constructor(...rules: URLMatchingRule[]) {
		this.rules = rules.length > 0 ? rules : Object.values(URLMatchingRule);
	}

	public match(name: string, attributes: { [s: string]: string }): string | undefined {

		for (const rule of this.rules) {
			switch (rule) {
				case URLMatchingRule.AHRef:
					if (name === "a" && "href" in attributes) {
						return attributes.href
					}
					break;
				case URLMatchingRule.ScriptSrc:
					if (name === "script" && "src" in attributes) {
						return attributes.src
					}
					break;
				case URLMatchingRule.LinkHref:
					if (name === "link" && "href" in attributes) {
						return attributes.href
					}
					break;
				case URLMatchingRule.ImgSrc:
					if (name === "img" && "src" in attributes) {
						return attributes.src
					}
					break;
				default:
					throw new Error(`unknown rule: ${rule}`);
			}
		}

		return undefined
	}
}
