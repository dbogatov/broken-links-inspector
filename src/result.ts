import { IReporter } from "./report"

export class Result {
	private pages = new Map<string, ResultItem[]>()
	private checkedUrls = new Set<string>()

	public add(completedCheck: ResultItem, parent: string = "original request") {
		// console.log(`${completedCheck.url} : ${completedCheck.status} ${completedCheck.message ? completedCheck.message : ""}`) // TODO

		if (this.pages.has(parent)) {
			this.pages.get(parent)?.push(completedCheck)
		} else {
			this.pages.set(parent, [completedCheck])
		}
		this.checkedUrls.add(completedCheck.url)
	}

	public isChecked(url: string): boolean {
		return this.checkedUrls.has(url)
	}

	public count(): number {
		let count = 0
		for (const page of this.pages.entries()) {
			count += page[1].length
		}
		return count
	}

	public report<ReporterT extends IReporter>(reporter: ReporterT): boolean {
		return reporter.process(this.pages)
	}
}

export class ResultItem {
	public url = ""
	public status = CheckStatus.OK
	public message?: string
}

export enum CheckStatus {
	OK = "OK",
	Skipped = "SKIP",
	Timeout = "TIMEOUT",
	NonSuccessCode = "ERROR CODE",
	GenericError = "UNKNOWN"
}
