import { Inspector, URLsMatchingSet, URLMatchingRule, Config } from "../src/inspector"
import { expect, assert } from "chai";
import "mocha";

describe("extractURLs", () => {

	const url = "dbogatov.org"

	it("works for <a href=...>", () => {
		const result = new Inspector(new URLsMatchingSet(URLMatchingRule.AHRef), new Config()).extractURLs(`<html><a href="${url}">Text</a></html>`)
		expect(result).to.eql(new Set([url]))
	});

	it("works for <script src=...>", () => {
		const result = new Inspector(new URLsMatchingSet(URLMatchingRule.ScriptSrc), new Config()).extractURLs(`<html><script src="${url}">Text</script></html>`)
		expect(result).to.eql(new Set([url]))
	});

	it("works for <link href=...>", () => {
		const result = new Inspector(new URLsMatchingSet(URLMatchingRule.LinkHref), new Config()).extractURLs(`<html><link href="${url}"></link></html>`)
		expect(result).to.eql(new Set([url]))
	});

	it("works for <img src=...>", () => {
		const result = new Inspector(new URLsMatchingSet(URLMatchingRule.ImgSrc), new Config()).extractURLs(`<html><img src="${url}">Text</img></html>`)
		expect(result).to.eql(new Set([url]))
	});

	it("works for <iframe src=...>", () => {
		const result = new Inspector(new URLsMatchingSet(URLMatchingRule.IFrameSrc), new Config()).extractURLs(`<html><iframe src="${url}">Text</iframe></html>`)
		expect(result).to.eql(new Set([url]))
	});

	it("works for many rules", () => {
		const result = new Inspector(new URLsMatchingSet(), new Config())
			.extractURLs(
				`<html>
					<a href="1">Text</a>
					<script src="2">Text</script>
					<link href="3"></link>
					<img src="4">Text</img>
				</html>`
			)
		expect(result).to.eql(new Set(["1", "2", "3", "4"]))
	});

	it("does not match unless rule supplied", () => {
		const result = new Inspector(new URLsMatchingSet(URLMatchingRule.ImgSrc), new Config())
			.extractURLs(
				`<html>
					<img src="${url}">Text</img>
					<link href="another-url"></link>
				</html>`
			)
		expect(result).to.eql(new Set([url]))
	});

	it("filters duplicates", () => {
		const result = new Inspector(new URLsMatchingSet(), new Config())
			.extractURLs(
				`<html>
					<img src="${url}">Text</img>
					<script src="${url}">Text</script>
					<link href="another-url"></link>
				</html>`
			)
		expect(result).to.eql(new Set([url, "another-url"]))
	});

	it("fails for unknown rule", () => {
		assert.throws(() => new Inspector(new URLsMatchingSet("error" as URLMatchingRule), new Config()).extractURLs(`<html><img src="${url}">Text</img></html>`), /unknown/)
	});

});
