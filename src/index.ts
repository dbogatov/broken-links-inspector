import commander from "commander"
import chalk from "chalk"
import { Inspector, URLsMatchingSet, Config } from "./inspector"
import { ConsoleReporter } from "./report"

commander
	.version("0.1.0") // TODO automatically
	.description("Extract and recursively check all URLs reporting broken ones")

commander
	.command("inspect <url>")
	.description("Check links in the given URL")
	.option("-r, --recursive", "recursively check all links in all URLs within supplied host", false)
	.action(async (url: string, inspectObj) => {

		let inspector = new Inspector(new URLsMatchingSet(), new Config())
		let result = await inspector.processURL(new URL(url), inspectObj.recursive)
		let success = result.report(new ConsoleReporter())

		process.exit(success ? 0 : 1)
	})

if (!process.argv.slice(2).length) {
	commander.outputHelp()
	process.exit()
}
commander.parse(process.argv)
