import { IReporter } from "./report"

export class Result {
	private pages = new Map<string, ResultItem[]>()
	private checkedUrls = new Set<string>()
	private addedCount = 0
	private atLeastOneBroken = false

	constructor(readonly ignoreSkipped: boolean, readonly disablePrint: boolean) { }

	public add(completedCheck: ResultItem, parent = "original request"): void {
		if (completedCheck.status == CheckStatus.Skipped && this.ignoreSkipped) {
			return
		}

		if (!this.disablePrint) {
			if (this.addedCount > 0 && this.addedCount % 80 == 0) {
				process.stdout.write("\n")
			}
			process.stdout.write(isStatusFailure(completedCheck.status) ? "x" : ".")
			this.addedCount++
		}

		if (this.pages.has(parent)) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			this.pages.get(parent)!.push(completedCheck)
		} else {
			this.pages.set(parent, [completedCheck])
		}
		this.checkedUrls.add(completedCheck.url)

		if (isStatusFailure(completedCheck.status)) {
			this.atLeastOneBroken = true
		}
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

	public report<ReporterT extends IReporter>(reporter: ReporterT): unknown {
		return reporter.process(this.pages)
	}

	public success(): boolean {
		return !this.atLeastOneBroken
	}

	public set(pages: Map<string, ResultItem[]>): void {
		this.pages = pages
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
	Retried = "RETRIED",
	Timeout = "TIMEOUT",
	NonSuccessCode = "ERROR CODE",
	GenericError = "UNKNOWN"
}

export function isStatusFailure(status: CheckStatus): boolean {
	return false ||
		status == CheckStatus.GenericError ||
		status == CheckStatus.Timeout ||
		status == CheckStatus.NonSuccessCode
}
