# Event pagination input contract

This implementation note applies to `GET /v1/events/recent` (`limit`) and
`GET /v1/events` (`limit`, `offset`). It does not change the normative VCP/VAP
specifications or make mock records cryptographically verified.

## Accepted query values

A supplied pagination field must occur once as a scalar, nonempty string of
ASCII decimal digits. Its numeric value must be a JavaScript safe integer
(no greater than `9007199254740991`). `limit` must be at least 1; `offset`
must be at least 0. Leading zeros remain accepted as decimal, for example
`limit=002` means 2. There is no coercion of arrays or objects.

Omitting a field is different from supplying an empty or invalid value:

| Endpoint | Absent values | Existing result cap |
| --- | --- | --- |
| `/v1/events/recent` | `limit=10` | 100 |
| `/v1/events` | `limit=50`, `offset=0` | 500 |

Clients should stay within the documented page-size ranges. For compatibility,
a syntactically valid, safe positive limit above the result cap is still
clamped rather than rejected. In advanced search, `query.limit` still echoes
the supplied numeric value, not the capped count, and `total` still counts
only the returned page. Neither the page cap nor response shapes are changed.

## Rejected values

Empty strings, signs, surrounding whitespace, fractions, scientific notation,
hexadecimal notation, suffixes, values beyond the safe integer range, repeated
parameters and bracketed array/object values receive HTTP 400 with
`error: "invalid_parameter"`. This happens before invoking the corresponding
events data-source method. Messages do not include the submitted input.
`limit=0` and all negative offsets are invalid; `offset=0` remains valid.

Examples include `limit=abc`, `limit=2junk`, `limit=1.5`, `limit=0`,
`offset=-1`, `limit=1&limit=2`, `limit[]=1`, and `limit[page]=1`.
A valid request whose data source fails still returns the existing JSON 500
response, not a misleading validation error.

This is intentionally narrower than full query validation. Other filters,
unknown parameters, time-range precision, sorting, and algorithm-filter
semantics have not been changed or certified by this work. The `/recent`
endpoint still does not implement an offset. No live API deployment is implied.

## Regression evidence and limits

`test/pagination.test.cjs` exercises the actual compiled HTTP server, not just
an isolated numeric parser. It checks 41 malformed request shapes, 14 accepted
compatibility requests in two groups, and two genuine source failures. It
tracks method calls to ensure malformed pagination is rejected before data
access, while leaving the real rate limiter enabled. The suite contributes
45 tests; the preexisting 56 tests are unchanged.

The same regression file was first run against unmodified application source
at `5dba26bb8422f74da018dc523da0009dfe273a70`, via test-only commit
`5980d9c4c60fa790e91333a5caca6a2527124d74`. In initial Actions run
[40338964596](https://github.com/veritaschain/vcp-explorer-api/actions/runs/40338964596),
40 of the 41 malformed requests incorrectly returned 200; only negative
recent-limit input was already rejected. For example, negative advanced
search offset returned a tail slice. This run intentionally failed the new
regression, and no failing version was merged.

Raw responses, expected statuses, platform and data-source call counts are
saved to `pagination-http.json` in the existing CI evidence artifact. These
are bounded first-party tests on synthetic mock data, not independent protocol
reproduction, exhaustive input coverage, a security certificate or proof of
regulatory compliance. Follow the final PR CI record for the corrected result.

References:
- [Express 4 request query](https://expressjs.com/en/4x/api.html#req.query): query values are untrusted and may not be strings.
- [JavaScript parseInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt): partial parsing is not whole-input validation.
