# Broken Links Inspector

[![NPM](https://img.shields.io/badge/NPM-latest-blue)](https://www.npmjs.com/package/broken-links-inspector]) [![pipeline status](https://git.dbogatov.org/dbogatov/broken-links-inspector/badges/master/pipeline.svg)](https://git.dbogatov.org/dbogatov/broken-links-inspector/-/commits/master) [![coverage report](https://git.dbogatov.org/dbogatov/broken-links-inspector/badges/master/coverage.svg)](https://git.dbogatov.org/dbogatov/broken-links-inspector/-/commits/master)

This project is heavily inspired by [stevenvachon/broken-link-checker](https://github.com/stevenvachon/broken-link-checker).

> If you want to use this tool and need any help (instructions, bug fixes, features) [open an issue](https://github.com/dbogatov/broken-links-inspector/issues)!

Features:
- inspects a web-page and all its URLs, reports broken ones
- can go recursively, inspecting all pages within a domain
- makes requests in parallel, shows indication of "work in progress"
- does not check URL twice
- reports OK, TIMEOUT, ERROR CODE or generic error
- support configurable timeout
- supports GET and HEAD methods (double checks with GET if HEAD fails)
- supports a list of excluded URLs (glob matching) and/or excluded prefixes (e.g. `mailto:`)
- can define OK codes, such as 999 for linkedin
- supports different reporting, such as colored console or JUnit file
- JUnit report is best used with CI (tested with [GitLab](https://docs.gitlab.com/ee/ci/junit_test_reports.html))
- need a feature, [go to issues](https://github.com/dbogatov/broken-links-inspector/issues)

## How to use

```
$ bli inspect -h

Usage: index inspect [options] <url>

Check links in the given URL

Options:
  -r, --recursive                             recursively check all links in all URLs within supplied host (default: false)
  -t, --timeout <number>                      timeout in ms after which the link will be considered broken (default: 2000)
  -g, --get                                   use GET request instead of HEAD (default: false)
  -s, --skip <globs>                          URLs to skip defined by globs, like '*linkedin*' (default: [])
  --reporters <coma-separated-strings>        Reporters to use in processing the results (junit, console) (default: ["console"])
  --ignore-prefixes <coma-separated-strings>  prefix(es) to ignore (without ':'), like mailto: and tel: (default: ["javascript","data","mailto","sms","tel","geo"])
  --accept-codes <coma-separated-numbers>     HTTP response code(s) (beyond 200-299) to accept, like 999 for linkedin (default: [999])
  --ignore-skipped                            Do not report skipped URLs (default: false)
  -v, --verbose                               log progress of checking URLs (default: false)
  -h, --help                                  display help for command
```

Example:
```
$ bli inspect https://dbogatov.org -r -t 2000 -s linkedin --reporters console
```

<details>
	<summary>See output</summary>

```
................................................................................
................................................................................
........................
original request
	OK      : https://dbogatov.org/
	OK: 1, skipped: 0, broken: 0
https://dbogatov.org/
	OK      : https://scholar.google.com/citations?user=Mq8ButkAAAAJ
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/docs/resume.pdf
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/docs/cv.pdf
	OK      : https://twitter.com/Dima4ka007
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/vendor/css/merged.css
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/vendor/js/merged.js
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/img/dmytro-bogatov.jpg
	OK      : https://dbogatov.org/contact
	OK      : https://dbogatov.org/research
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/favicon.ico
	OK      : https://dbogatov.org/publications
	OK      : https://www.googletagmanager.com/gtag/js?id=UA-65293382-4
	OK      : https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css
	OK      : https://git.dbogatov.org/dbogatov/research-website/commit/39ecd1a9
	OK      : https://dbogatov.org/projects
	OK      : https://www.facebook.com/dkbogatov
	OK      : https://dbogatov.org/education
	OK      : https://github.com/dbogatov
	OK: 18, skipped: 3, broken: 0
https://dbogatov.org/education
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/config/grades.yml
	OK: 1, skipped: 21, broken: 0
https://dbogatov.org/projects
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/img/projects/mandelbrot.png
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/img/projects/matters-proj.png
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/img/projects/shevastream.png
	OK      : https://github.com/WPIMHTC
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/img/projects/status-site.png
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/img/projects/bu-logo.png
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/img/projects/fabric.png
	OK      : https://github.com/dbogatov/shevastream
	OK      : https://legacy.dbogatov.org/Project/Mandelbrot
	OK      : https://github.com/dbogatov/legacy-website
	OK      : https://github.com/IBM/dac-lib
	OK      : https://github.com/dbogatov/status-site
	OK      : https://github.com/dbogatov/ore-benchmark
	OK      : https://shevastream.com/
	OK      : https://status.dbogatov.org/
	OK      : https://ore.dbogatov.org/
	OK      : http://matters.mhtc.org/
	OK      : https://dbogatov.org/assets/docs/dac-fabric.pdf
	OK: 18, skipped: 21, broken: 0
https://dbogatov.org/publications
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/docs/mqp-paper.pdf
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/docs/econ-paper.pdf
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/docs/ore-presentation.pdf
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/docs/ore-poster.pdf
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/docs/ore-benchmark.pdf
	OK      : http://dispot.korkinlab.org/
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/docs/dac-fabric.pdf
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/docs/dispot.pdf
	OK      : https://hub.docker.com/r/korkinlab/dispot
	OK      : https://github.com/korkinlab/dispot
	OK      : https://digitalcommons.wpi.edu/cgi/viewcontent.cgi?article=2915&amp;context=iqp-all
	OK      : https://dl.acm.org/doi/10.14778/3324301.3324309
	OK      : https://doi.org/10.14778/3324301.3324309
	OK      : https://doi.org/10.1093/bioinformatics/btz587
	OK      : https://academic.oup.com/bioinformatics/article/35/24/5374/5539863
	OK: 15, skipped: 21, broken: 0
https://dbogatov.org/research
	OK      : http://people.cs.georgetown.edu/~kobbi/
	OK      : https://arxiv.org/abs/1706.01552
	OK      : https://www.cs.bu.edu/~reyzin/
	OK      : http://www.cs.bu.edu/~gkollios/
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/img/collaborators/bjoern.png
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/img/collaborators/kobi.jpg
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/img/collaborators/kellaris.jpeg
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/img/collaborators/lorenzo.png
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/img/collaborators/leo.png
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/img/collaborators/adam.jpg
	OK      : http://www.cs.bu.edu/fac/gkollios/
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/img/collaborators/kollios.png
	OK      : https://d3g9eenuvjhozt.cloudfront.net/assets/img/collaborators/pixel.jpg
	OK      : https://www.icloud.com/sharedalbum/
	OK      : https://www.cics.umass.edu/people/oneill-adam
	OK      : https://computerscience.uchicago.edu/people/profile/lorenzo-orecchia/
	OK      : https://midas.bu.edu/
	OK      : https://dblp.org/pers/t/Tackmann:Bj=ouml=rn.html
	OK      : https://dbogatov.org/assets/docs/ore-benchmark.pdf
	OK      : https://dbogatov.org/assets/docs/dac-fabric.pdf
	OK: 20, skipped: 22, broken: 0
https://dbogatov.org/contact
	OK: 0, skipped: 23, broken: 0
OK: 73, skipped: 111, broken: 0
```

</details>

Return code: 1 if at least one broken link detected, 0 otherwise.

`-r, --recursive` will instruct inspector to keep checking all URLs in the original domain.
Very useful for checking an entire website, such as personal blog.
For example, `bli inspect https://yoursite.com -r` will check `yoursite.com` and if it finds something like `yoursite.com/contact` it will check that as well and will keep going.
It will check all URLs on all pages, but will not parse "external" pages.

`-t, --timeout <number>` given in milliseconds sets a timeout for a request.
If this timeout is exceeded, the check fails with TIMEOUT.

`-g, --get` instructs to use GET request instead fo the default HEAD request.
If HEAD request fails, the URL will be retried with GET.

`-s, --skip <coma-separated-globs>` is a list of globs or parts of URL to skip.
As an example, `-s *linkedin* -s hello` will instruct to skip all URLs which contain either `linkedin` or `hello` in them.

`--reporters <coma-separated-strings>` is a list of reporters to process the result.
Currently there are two: `console` and `junit`.
`console` will print appealing colored report to the console.
`junit` will produce `junit-report.xml` file in the current directory.
JUnit file treats pages as test suites and URLs in a page as test cases.

`--ignore-prefixes <coma-separated-strings>` is a list of prefixes/ schemas to skip, such as `mailto:`.
Provided list should not include colons.

`--accept-codes <coma-separated-numbers>` is a list of HTTP code to consider successful, like 999 for linkedin.

`--ignore-skipped` excludes skipped URLs from reports.

`-v, --verbose` currently unused.

## How to build

```
npm install # to install dependencies

npm run build # to compile TS (result in ./dist/index.js)

npm run coverage # to run tests and coverage
```
