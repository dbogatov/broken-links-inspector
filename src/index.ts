#!/usr/bin/env node

import commander from "commander"
import chalk from "chalk"
import { Inspector, URLsMatchingSet } from "./inspector"
import { ConsoleReporter, JUnitReporter } from "./report"
import fs from "fs/promises"

commander
	.version("1.3.1")
	.description("Extract and recursively check all URLs reporting broken ones\n\nDedicated to Daria Bogatova \u2665")

commander
	.command("inspect <url>|<file://>")
	.description("Check links in the given URL or a text file")
	.option("-r, --recursive", "recursively check all links in all URLs within supplied host (ignored for file://)", false)
	.option("-t, --timeout <number>", "timeout in ms after which the link will be considered broken", (value: string, _) => parseInt(value), 2000)
	.option("-g, --get", "use GET request instead of HEAD", false)
	.option("-s, --skip <globs>", "URLs to skip defined by globs, like '*linkedin*'", (value: string, previous: string[]) => previous.concat([value]), [])
	.option("--reporters <coma-separated-strings>", "Reporters to use in processing the results (junit, console)", (value: string, _) => value.split(","), ["console"])
	.option("--retries <number>", "The number of times to retry TIMEOUT URLs", (value: string, _) => parseInt(value), 3)
	.option("--ignore-prefixes <coma-separated-strings>", "prefix(es) to ignore (without ':'), like mailto: and tel:", (value: string, _) => value.split(","), ["javascript", "data", "mailto", "sms", "tel", "geo"])
	.option("--accept-codes <coma-separated-numbers>", "HTTP response code(s) (beyond 200-299) to accept, like 999 for linkedin", (value: string, _) => value.split(",").map(code => parseInt(code)), [999])
	.option("--ignore-skipped", "Do not report skipped URLs", false)
	.option("--single-threaded", "Do not enable parallelization", false)
	.option("-v, --verbose", "log progress of checking URLs", false)
	.action(async (url: string, inspectObj) => {

		const urls: URL[] = []

		if (url.startsWith("file://")) {

			const file = await fs.readFile(url.replace("file://", ""), "utf-8")

			for (const line of file.toString().split("\n")) {
				if (!line.trim()) {
					continue
				}
				try {
					const url = new URL(line)
					urls.push(url)
					console.log(`From file: ${line}`)
				} catch (e) {
					console.warn(chalk.yellow(`${line} does not look a like valid URL`))
				}
			}
		} else {
			try {
				urls.push(new URL(url))
			} catch (e) {
				console.error(chalk.red(`${url} does not look like a valid URL (forgot http(s)?)`))
				process.exit(1)
			}
		}

		const inspector = new Inspector(new URLsMatchingSet(), {
			acceptedCodes: inspectObj.acceptCodes as number[],
			timeout: parseInt(inspectObj.timeout as string),
			ignoredPrefixes: inspectObj.ignorePrefixes as string[],
			skipURLs: inspectObj.skip as string[],
			verbose: inspectObj.verbose as boolean,
			get: inspectObj.get as boolean,
			ignoreSkipped: inspectObj.ignoreSkipped as boolean,
			singleThreaded: inspectObj.singleThreaded as boolean,
			disablePrint: false,
			retries: inspectObj.retries as number
		})

		if (urls.length == 0) {
			process.exit(1)
		}

		const result = await inspector.processURL(urls, urls.length == 1 ? inspectObj.recursive as boolean : false)

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
