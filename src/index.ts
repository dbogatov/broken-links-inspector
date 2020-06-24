#!/usr/bin/env node

import commander from "commander"
import chalk from "chalk"
import { Inspector, URLsMatchingSet, Config } from "./inspector"
import { ConsoleReporter, JUnitReporter } from "./report"

commander
	.version("0.2.3")
	.description("Extract and recursively check all URLs reporting broken ones")

commander
	.command("inspect <url>")
	.description("Check links in the given URL")
	.option("-r, --recursive", "recursively check all links in all URLs within supplied host", false)
	.option("-v, --verbose", "log progress of checking URLs", false)
	.option("-g, --get", "use GET request instead of HEAD", false)
	.option("-t, --timeout <number>", "timeout in ms after which the link will be considered broken", (value: string, _) => parseInt(value), 2000)
	.option("--ignore-prefixes <coma-separated-strings>", "prefix(es) to ignore (without ':'), like mailto: and tel:", (value: string, _) => value.split(","), ["javascript", "data", "mailto", "sms", "tel", "geo"])
	.option("--accept-codes <coma-separated-numbers>", "HTTP response code(s) (beyond 200-299) to accept, like 999 for linkedin", (value: string, _) => value.split(",").map(code => parseInt(code)), [999])
	.option("--reporters <coma-separated-strings>", "Reporters to use in processing the results (junit, console)", (value: string, _) => value.split(","), ["console"])
	.option("--ignore-skipped", "Do not report skipped URLs", false)
	.option("-s, --skip <globs>", "URLs to skip defined by globs, like '*linkedin*'", (value: string, previous: string[]) => previous.concat([value]), [])
	.action(async (url: string, inspectObj) => {

		try {
			new URL(url)
		} catch (e) {
			console.error(chalk.red(`${url} does not look like valid URL (forgot http(s)?)`))
			process.exit(1)
		}

		let inspector = new Inspector(new URLsMatchingSet(), {
			acceptedCodes: inspectObj.acceptCodes as number[],
			timeout: parseInt(inspectObj.timeout as string),
			ignoredPrefixes: inspectObj.ignorePrefixes as string[],
			skipURLs: inspectObj.skip as string[],
			verbose: inspectObj.verbose as boolean,
			get: inspectObj.get as boolean,
			ignoreSkipped: inspectObj.ignoreSkipped as boolean
		})

		let result = await inspector.processURL(new URL(url), inspectObj.recursive as boolean)

		for (const reporter of inspectObj.reporters as string[]) {
			switch (reporter) {
				case "junit":
					result.report(new JUnitReporter())
					break
				case "console":
					result.report(new ConsoleReporter())
					break
			}
		}

		process.exit(result.success() ? 0 : 1)
	})

if (!process.argv.slice(2).length) {
	commander.outputHelp()
	process.exit()
}
commander.parse(process.argv)
