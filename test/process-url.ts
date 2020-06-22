import { extractURLs, URLMatchingRule, URLsMatchingSet, processURL, CheckStatus, Config } from "../src/extractor"
import { expect, assert } from "chai";
import "mocha";

describe("processURL", function () {

	this.timeout(50_000);

	const validURL = new URL("https://dbogatov.org")

	it("processes non-recursive", async () => {
		const result = await processURL(validURL, false, new Config(), new URLsMatchingSet())

		assert(result.count() == 1)
		// assert(result[0].url === validURL.href)
		// assert(result[0].status == CheckStatus.OK)
	});

	it("processes recursive", async () => {
		const result = await processURL(validURL, true, new Config(), new URLsMatchingSet())

		result.report()

		// assert(result.length == 1)
		// assert(result[0].url === validURL.href)
		// assert(result[0].status == CheckStatus.OK)
	});

});
