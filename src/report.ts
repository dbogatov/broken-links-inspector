import { ResultItem, CheckStatus } from "./result"
import chalk from "chalk"
import { parse } from "js2xmlparser"

import fs from "fs";

export interface IReporter {
	process(pages: Map<string, ResultItem[]>): void
}

/**
 *	testsuite = [
 *		{
 *			"@": {
 *				name: "parent URL",
 *				tests: totalTests
 *				failures: broken,
 *				skipped: skipped
 *			}
 *			"testcase" = [
 *				{
 *					"@": {
 *						name: URL,
 *					},
 *					error?: {
 *						"@": {
 *							message: "error message"
 *						}
 *					},
 *					skipped?: {}
 *				}
 *			]
 *		}
 *	]
 */
export class JUnitReporter implements IReporter {

	constructor(readonly toFile: boolean = true) { }

	process(pages: Map<string, ResultItem[]>): void {

		let junitObject: any[] = []

		for (const page of pages) {

			let testsuite: any = {
				testcase: []
			}

			let skipped = 0
			let oks = 0
			let broken = 0

			for (const check of page[1]) {

				let testcase: any = {
					"@": {
						name: check.url,
						classname: page[0],
						time: "0.0000"
					}
				}

				switch (check.status) {
					case CheckStatus.NonSuccessCode:
						testcase["failure"] = {
							"@": {
								message: check.message
							}
						}
						broken++
						break
					case CheckStatus.GenericError:
						testcase["failure"] = {
							"@": {
								message: "Unknown error"
							}
						}
						broken++
						break
					case CheckStatus.Timeout:
						testcase["failure"] = {
							"@": {
								message: "Timeout"
							}
						}
						broken++
						break
					case CheckStatus.Skipped:
						testcase["skipped"] = {}
						skipped++
						break
					case CheckStatus.OK:
						oks++
						break
				}

				testsuite.testcase.push(testcase)
			}

			testsuite["@"] = {
				name: page[0],
				tests: oks + skipped + broken,
				failures: broken,
				skipped: skipped,
				time: "0.0000"
			}

			junitObject.push(testsuite)
		}

		let junitXml = parse("testsuites", { testsuite: junitObject })
		if (this.toFile) {
			fs.writeFileSync("junit-report.xml", junitXml)
		} else {
			console.log(junitXml)
		}
	}

}

export class ConsoleReporter implements IReporter {

	private printTotals(oks: number, skipped: number, broken: number, indent: boolean = true) {
		console.log(`${indent ? "\t" : ""}${chalk.green(`OK: ${oks}`)}, ${chalk.grey(`skipped: ${skipped}`)}, ${chalk.red(`broken: ${broken}`)}`)
	}

	private printCheck(check: ResultItem) {
		let statusLabel: string
		const labelWidth = 7

		switch (check.status) {
			case CheckStatus.OK:
				statusLabel = chalk.green("OK".padEnd(labelWidth))
				break;
			case CheckStatus.Skipped:
				statusLabel = chalk.gray("SKIP".padEnd(labelWidth))
				break;
			case CheckStatus.Timeout:
				statusLabel = chalk.yellow("TIMEOUT".padEnd(labelWidth))
				break;
			case CheckStatus.NonSuccessCode:
			case CheckStatus.GenericError:
				statusLabel = chalk.red("BROKEN".padEnd(labelWidth))
				break;
		}

		if (check.status != CheckStatus.Skipped) {
			console.log(`\t${statusLabel} : ${chalk.italic(check.url)} ${check.message ? `(${chalk.italic.grey(check.message)})` : ""}`)
		}
	}

	process(pages: Map<string, ResultItem[]>) {

		let allSkipped = 0
		let allOks = 0
		let allBroken = 0

		for (const page of pages.entries()) {
			console.log(page[0])

			let skipped = 0
			let oks = 0
			let broken = 0

			for (const check of page[1]) {
				switch (check.status) {
					case CheckStatus.OK:
						oks++
						break
					case CheckStatus.NonSuccessCode:
					case CheckStatus.GenericError:
					case CheckStatus.Timeout:
						broken++
						break
					case CheckStatus.Skipped:
						skipped++
						break
				}

				this.printCheck(check)

			}
			this.printTotals(oks, skipped, broken)
			allOks += oks
			allSkipped += skipped
			allBroken += broken
		}
		this.printTotals(allOks, allSkipped, allBroken, false)
	}

}
