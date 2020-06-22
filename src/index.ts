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
	.option("-t, --timeout <number>", "timeout in ms after which the link will be considered broken", (value: string, _) => parseInt(value), 2000)
	.option("--ignore-prefixes <coma-separated-strings>", "prefix(es) to ignore (without ':'), like mailto: and tel:", (value: string, _) => value.split(","), ["mailto", "tel"])
	.option("--accept-codes <coma-separated-numbers>", "HTTP response code(s) (beyond 200-299) to accept, like 999 for linkedin", (value: string, _) => value.split(",").map(code => parseInt(code)), [999])
	.option("-s, --skip <globs>", "URLs to skip defined by globs, like '*linkedin*'", (value: string, previous: string[]) => previous.concat([value]), [])
	.action(async (url: string, inspectObj) => {

		let inspector = new Inspector(new URLsMatchingSet(), {
			acceptedCodes: inspectObj.acceptCodes as number[],
			timeout: parseInt(inspectObj.timeout as string),
			ignoredPrefixes: inspectObj.ignorePrefixes as string[],
			skipURLs: inspectObj.skip as string[]
		})
		let result = await inspector.processURL(new URL(url), inspectObj.recursive)
		let success = result.report(new ConsoleReporter())

		process.exit(success ? 0 : 1)
	})

if (!process.argv.slice(2).length) {
	commander.outputHelp()
	process.exit()
}
commander.parse(process.argv)
