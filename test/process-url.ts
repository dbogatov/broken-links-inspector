import { Inspector, URLsMatchingSet, URLMatchingRule, Config } from "../src/inspector"
import { expect, assert } from "chai";
import "mocha";
import { ConsoleReporter } from "../src/report";

describe("processURL", function () {

	this.timeout(50_000);

	const validURL = new URL("https://dbogatov.org")

	it("processes non-recursive", async () => {
		const result = await new Inspector(new URLsMatchingSet(), new Config()).processURL(validURL, false)

		assert(result.count() > 1)
		// assert(result[0].url === validURL.href)
		// assert(result[0].status == CheckStatus.OK)
	});

	it("processes recursive", async () => {
		const result = await new Inspector(new URLsMatchingSet(), new Config()).processURL(validURL, true)

		result.report(new ConsoleReporter())

		// assert(result.length == 1)
		// assert(result[0].url === validURL.href)
		// assert(result[0].status == CheckStatus.OK)
	});

});
