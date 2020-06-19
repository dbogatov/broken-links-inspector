import commander from "commander"
import chalk from "chalk"
import { extractURLs } from "./extractor"

commander
	.version("0.1.0") // TODO automatically
	.description("Extract and recursively check all URLs reporting broken ones")

commander
	.command("list")
	.description("List extracted URLs")
	.action(() => {
		console.log("Action list called");
	})

if (!process.argv.slice(2).length) {
	commander.outputHelp()
	process.exit()
}
commander.parse(process.argv)
