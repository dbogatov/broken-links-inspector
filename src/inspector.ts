import * as parser from "htmlparser2"
import axios, { AxiosError } from "axios"
import { Result, CheckStatus } from "./result"
import { isMatch } from "matcher"

export interface IHttpClient {
	request(get: boolean, url: string): Promise<string>
}

export class HttpClientFailure {
	constructor(
		readonly timeout: boolean,
		readonly code: number
	) { }
}

export class AxiosHttpClient implements IHttpClient {

	constructor(
		readonly timeout: number,
		readonly acceptedCodes: number[]
	) { }

	private async timeoutWrapper<T>(timeoutMs: number, promise: () => Promise<T>, failureMessage = "timeout"): Promise<T> {
		let timeoutHandle: NodeJS.Timeout | undefined
		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutHandle = setTimeout(() => reject(new Error(failureMessage)), timeoutMs)
		})

		const result = await Promise.race([
			promise(),
			timeoutPromise
		])
		if (timeoutHandle) {
			clearTimeout(timeoutHandle)
		}
		return result
	}

	async request(get: boolean, url: string): Promise<string> {

		const instance = axios.create()

		try {
			return (await this.timeoutWrapper(this.timeout, () => get ? instance.get(url) : instance.head(url))).data as string
		} catch (exception) {

			const error: AxiosError = exception

			if ((exception.message as string).includes("timeout")) {
				throw new HttpClientFailure(true, -1)
			} else if (!error.response) {
				throw new HttpClientFailure(false, -1)
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				if (this.acceptedCodes.some(code => code == error.response!.status)) {
					return ""
				} else {
					throw new HttpClientFailure(false, error.response.status)
				}
			}
		}
	}
}

export class Inspector {

	constructor(
		private readonly matcher: URLsMatchingSet,
		private readonly config: Config,
		private readonly httpClient: IHttpClient = new AxiosHttpClient(config.timeout, config.acceptedCodes)
	) { }

	async processURL(originalUrl: URL, recursive: boolean): Promise<Result> {

		const result = new Result(this.config.ignoreSkipped, this.config.disablePrint)
		// [url, GET, parent?]
		const urlsToCheck: [string, boolean, string?][] = [[originalUrl.href, true, undefined]]

		const processingRoutine = async (url: string, useGet: boolean, parent?: string) => {

			try {
				try {
					url = new URL(url).href
				} catch (_) {
					url = new URL(url, parent).href
				}
				if (url.includes("#")) {
					url = url.split("#")[0]
				}
				const shouldParse = url == originalUrl.href || (recursive && originalUrl.origin == new URL(url).origin)

				if (
					result.isChecked(url) ||
					this.config.ignoredPrefixes.some(ext => url.startsWith(ext + ":")) ||
					this.config.skipURLs.some(glob => url.includes(glob) || isMatch(url, glob))
				) {
					result.add({ url: url, status: CheckStatus.Skipped }, parent)
				} else {
					const urlToCheck = parent ? new URL(url, parent).href : url

					const html = await this.httpClient.request(useGet || shouldParse, urlToCheck)

					if (shouldParse) {

						const discoveredURLs = this.extractURLs(html)

						for (const discovered of discoveredURLs) {
							urlsToCheck.push([discovered, this.config.get, url])
						}
					}

					result.add({ url: url, status: CheckStatus.OK }, parent)
				}

			} catch (exception) {
				const error: HttpClientFailure = exception

				// if HEAD was used, retry with GET
				if (!useGet) {
					urlsToCheck.push([url, true, parent])
				} else {
					if (error.timeout) {
						result.add({ url: url, status: CheckStatus.Timeout }, parent)
					} else if (error.code > -1) {
						result.add({ url: url, status: CheckStatus.NonSuccessCode, message: `${error.code}` }, parent)
					} else {
						result.add({ url: url, status: CheckStatus.GenericError }, parent)
					}
				}
			}
		}

		const promises: Promise<void>[] = []

		while (urlsToCheck.length > 0) {

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const [url, useGet, parent] = urlsToCheck.pop()!

			promises.push(processingRoutine(url, useGet, parent))

			if (urlsToCheck.length == 0) {
				await Promise.all(promises)
			}
		}

		console.log()
		return result
	}

	extractURLs(html: string): Set<string> {

		const urls = new Set<string>()
		const matcher = this.matcher

		const parserInstance = new parser.Parser(
			{
				onopentag(name, attributes) {
					const match = matcher.match(name, attributes)
					if (match && match !== "" && !match.startsWith("#")) {
						urls.add(match)
					}
				}
			},
			{ decodeEntities: true }
		)
		parserInstance.write(html)
		parserInstance.end()

		return urls
	}
}


export class Config {
	acceptedCodes: number[] = [999]
	timeout = 2000
	ignoredPrefixes: string[] = ["mailto", "tel"]
	skipURLs: string[] = []
	verbose = false
	get = false
	ignoreSkipped = false
	disablePrint = false
}

export enum URLMatchingRule {
	AHRef = "<a href>",
	ScriptSrc = "<script src>",
	LinkHref = "<link href>",
	ImgSrc = "<img src>",
	IFrameSrc = "<iframe src>"
}

export class URLsMatchingSet {
	private rules: URLMatchingRule[]

	constructor(...rules: URLMatchingRule[]) {
		this.rules = rules.length > 0 ? rules : Object.values(URLMatchingRule)
	}

	public match(name: string, attributes: { [s: string]: string }): string | undefined {

		for (const rule of this.rules) {
			switch (rule) {
				case URLMatchingRule.AHRef:
					if (name === "a" && "href" in attributes) {
						return attributes.href
					}
					break
				case URLMatchingRule.ScriptSrc:
					if (name === "script" && "src" in attributes) {
						return attributes.src
					}
					break
				case URLMatchingRule.LinkHref:
					if (name === "link" && "href" in attributes) {
						return attributes.href
					}
					break
				case URLMatchingRule.ImgSrc:
					if (name === "img" && "src" in attributes) {
						return attributes.src
					}
					break
				case URLMatchingRule.IFrameSrc:
					if (name === "iframe" && "src" in attributes) {
						return attributes.src
					}
					break
				default:
					throw new Error(`unknown rule: ${rule}`)
			}
		}

		return undefined
	}
}
