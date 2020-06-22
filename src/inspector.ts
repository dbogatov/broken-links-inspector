import * as parser from "htmlparser2"
import axios, { AxiosError } from "axios"
import { Result, CheckStatus } from "./result";

export class Inspector {

	constructor(
		private readonly matcher: URLsMatchingSet,
		private readonly config: Config
	) { }

	async processURL(originalUrl: URL, recursive: boolean): Promise<Result> {

		let result = new Result();
		let urlsToCheck: [string, string?][] = [[originalUrl.href, undefined]]

		let processingRoutine = async (url: string, parent?: string) => {

			try {
				url = parent ? new URL(url, parent).href : url

				if (result.isChecked(url) || this.config.ignoredExtensions.some(ext => url.startsWith(ext + ":"))) {
					result.add({ url: url, status: CheckStatus.Skipped }, parent)
				} else {

					const response = await axios.get(parent ? new URL(url, parent).href : url, { timeout: this.config.timeout })
					let html = response.data as string

					if (url == originalUrl.href || (recursive && originalUrl.host == new URL(url).host)) {

						let discoveredURLs = this.extractURLs(html)

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
					if (this.config.acceptedCodes.some(code => code == error.response?.status)) {
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
	public acceptedCodes: number[] = [999]
	public timeout: number = 2000
	public ignoredExtensions: string[] = ["mailto", "tel"]
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
