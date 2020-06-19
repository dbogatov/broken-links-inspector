import * as parser from "htmlparser2"

export function extractURLs(html: string, matcher: URLsMatchingSet): string[] {

	let urls: string[] = []

	let parserInstance = new parser.Parser(
		{
			onopentag(name, attributes) {
				const match = matcher.match(name, attributes);
				if (match !== undefined && match !== "" && !match.startsWith("#")) {
					urls.push(match)
				}
			}
		},
		{ decodeEntities: true }
	);
	parserInstance.write(html)
	parserInstance.end()

	return urls.filter((value, index, self) => self.indexOf(value) === index)
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
