import * as parser from "htmlparser2"
import axios, { AxiosError } from "axios"
import { Result, CheckStatus } from "./result";
import { isMatch } from "matcher"

export class Inspector {

	constructor(
		private readonly matcher: URLsMatchingSet,
		private readonly config: Config
	) { }

	async timeout<T>(timeoutMs: number, promise: () => Promise<T>, failureMessage: string = "timeout"): Promise<T> {
		let timeoutHandle: NodeJS.Timeout | undefined
		const timeoutPromise = new Promise<never>((resolve, reject) => {
			timeoutHandle = setTimeout(() => reject(new Error(failureMessage)), timeoutMs)
		})

		const result = await Promise.race([
			promise(),
			timeoutPromise
		]);
		clearTimeout(timeoutHandle!);
		return result;
	}

	async processURL(originalUrl: URL, recursive: boolean): Promise<Result> {

		let result = new Result(this.config.ignoreSkipped);
		// [url, GET, parent?]
		let urlsToCheck: [string, boolean, string?][] = [[originalUrl.href, true, undefined]]

		let processingRoutine = async (url: string, useGet: boolean, parent?: string) => {

			try {
				url = parent ? new URL(url, parent).href : new URL(url).href
				if (url.includes("#")) {
					url = url.split("#")[0]
				}
				let shouldParse = url == originalUrl.href || (recursive && originalUrl.origin == new URL(url).origin)

				if (
					result.isChecked(url) ||
					this.config.ignoredPrefixes.some(ext => url.startsWith(ext + ":")) ||
					this.config.skipURLs.some(glob => url.includes(glob) || isMatch(url, glob))
				) {
					result.add({ url: url, status: CheckStatus.Skipped }, parent)
				} else {
					let urlToCheck = parent ? new URL(url, parent).href : url

					const instance = axios.create()
					const response = useGet || shouldParse ?
						await this.timeout(this.config.timeout, () => instance.get(urlToCheck)) :
						await this.timeout(this.config.timeout, () => instance.head(urlToCheck))

					let html = response.data as string

					if (shouldParse) {

						let discoveredURLs = this.extractURLs(html)

						for (const discovered of discoveredURLs) {
							urlsToCheck.push([discovered, this.config.get, url])
						}
					}

					result.add({ url: url, status: CheckStatus.OK }, parent)
				}

			} catch (exception) {
				const error: AxiosError = exception;

				// if HEAD was used, retry with GET
				if (!useGet) {
					urlsToCheck.push([url, true, parent])
				} else {
					if ((exception.message as string).includes("timeout")) {
						result.add({ url: url, status: CheckStatus.Timeout }, parent)
					} else if (!error.response) {
						result.add({ url: url, status: CheckStatus.GenericError }, parent)
					} else {
						if (this.config.acceptedCodes.some(code => code == error.response?.status)) {
							result.add({ url: url, status: CheckStatus.OK }, parent)
						} else {
							result.add({ url: url, status: CheckStatus.NonSuccessCode, message: `${error.response.status}` }, parent)
						}
					}
				}

			}

		}

		let promises: Promise<void>[] = []

		while (urlsToCheck.length > 0) {

			let [url, useGet, parent] = urlsToCheck.pop()!

			promises.push(processingRoutine(url, useGet, parent))

			if (urlsToCheck.length == 0) {
				await Promise.all(promises)
			}
		}

		console.log()
		return result
	}

	extractURLs(html: string): Set<string> {

		let urls = new Set<string>();
		let matcher = this.matcher

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
}


export class Config {
	acceptedCodes: number[] = [999]
	timeout: number = 2000
	ignoredPrefixes: string[] = ["mailto", "tel"]
	skipURLs: string[] = []
	verbose: boolean = false
	get: boolean = false
	ignoreSkipped: boolean = false
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
				case URLMatchingRule.IFrameSrc:
					if (name === "iframe" && "src" in attributes) {
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
