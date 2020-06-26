#!/usr/bin/env node

import commander from "commander"
import chalk from "chalk"
import { Inspector, URLsMatchingSet } from "./inspector"
import { ConsoleReporter, JUnitReporter } from "./report"

commander
	.version("1.1.4")
	.description("Extract and recursively check all URLs reporting broken ones\n\nDedicated to Daria Bogatova \u2665")

commander
	.command("inspect <url>")
	.description("Check links in the given URL")
	.option("-r, --recursive", "recursively check all links in all URLs within supplied host", false)
	.option("-t, --timeout <number>", "timeout in ms after which the link will be considered broken", (value: string, _) => parseInt(value), 2000)
	.option("-g, --get", "use GET request instead of HEAD", false)
	.option("-s, --skip <globs>", "URLs to skip defined by globs, like '*linkedin*'", (value: string, previous: string[]) => previous.concat([value]), [])
	.option("--reporters <coma-separated-strings>", "Reporters to use in processing the results (junit, console)", (value: string, _) => value.split(","), ["console"])
	.option("--ignore-prefixes <coma-separated-strings>", "prefix(es) to ignore (without ':'), like mailto: and tel:", (value: string, _) => value.split(","), ["javascript", "data", "mailto", "sms", "tel", "geo"])
	.option("--accept-codes <coma-separated-numbers>", "HTTP response code(s) (beyond 200-299) to accept, like 999 for linkedin", (value: string, _) => value.split(",").map(code => parseInt(code)), [999])
	.option("--ignore-skipped", "Do not report skipped URLs", false)
	.option("-v, --verbose", "log progress of checking URLs", false)
	.action(async (url: string, inspectObj) => {

		try {
			new URL(url)
		} catch (e) {
			console.error(chalk.red(`${url} does not look like valid URL (forgot http(s)?)`))
			process.exit(1)
		}

		const inspector = new Inspector(new URLsMatchingSet(), {
			acceptedCodes: inspectObj.acceptCodes as number[],
			timeout: parseInt(inspectObj.timeout as string),
			ignoredPrefixes: inspectObj.ignorePrefixes as string[],
			skipURLs: inspectObj.skip as string[],
			verbose: inspectObj.verbose as boolean,
			get: inspectObj.get as boolean,
			ignoreSkipped: inspectObj.ignoreSkipped as boolean,
			disablePrint: false
		})

		const result = await inspector.processURL(new URL(url), inspectObj.recursive as boolean)

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
