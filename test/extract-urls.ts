import { extractURLs, URLMatchingRule, URLsMatchingSet } from "../src/extractor"
import { expect, assert } from "chai";
import "mocha";

describe("extractURLs", () => {

	const url = "dbogatov.org"

	it("works for <a href=...>", () => {
		const result = extractURLs(`<html><a href="${url}">Text</a></html>`, new URLsMatchingSet(URLMatchingRule.AHRef))
		expect(result).to.eql([url])
	});

	it("works for <script src=...>", () => {
		const result = extractURLs(`<html><script src="${url}">Text</script></html>`, new URLsMatchingSet(URLMatchingRule.ScriptSrc))
		expect(result).to.eql([url])
	});

	it("works for <link href=...>", () => {
		const result = extractURLs(`<html><link href="${url}"></link></html>`, new URLsMatchingSet(URLMatchingRule.LinkHref))
		expect(result).to.eql([url])
	});

	it("works for <img src=...>", () => {
		const result = extractURLs(`<html><img src="${url}">Text</img></html>`, new URLsMatchingSet(URLMatchingRule.ImgSrc))
		expect(result).to.eql([url])
	});

	it("works for many rules", () => {
		const result = extractURLs(
			`<html>
				<a href="1">Text</a>
				<script src="2">Text</script>
				<link href="3"></link>
				<img src="4">Text</img>
			</html>`,
			new URLsMatchingSet()
		)
		expect(result).to.eql(["1", "2", "3", "4"])
	});

	it("does not match unless rule supplied", () => {
		const result = extractURLs(
			`<html>
				<img src="${url}">Text</img>
				<link href="another-url"></link>
			</html>`,
			new URLsMatchingSet(URLMatchingRule.ImgSrc)
		)
		expect(result).to.eql([url])
	});

	it("filters duplicates", () => {
		const result = extractURLs(
			`<html>
				<img src="${url}">Text</img>
				<script src="${url}">Text</script>
				<link href="another-url"></link>
			</html>`,
			new URLsMatchingSet()
		)
		expect(result).to.eql([url, "another-url"])
	});

	it("fails for unknown rule", () => {
		assert.throws(() => extractURLs(`<html><img src="${url}">Text</img></html>`, new URLsMatchingSet("error" as URLMatchingRule)), /unknown/)
	});

});
