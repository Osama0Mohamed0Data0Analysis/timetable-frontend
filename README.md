# مولّد الجداول الأكاديمية: Front end

Plain ES modules, no build step. Run: `python3 -m http.server 8000` then open http://localhost:8000
(ES modules do not work from `file://`). Starts on a built-in mock; set `USE_MOCK: false` in `js/config.js` to hit your API.

## Structure
- `api/ApiClient.js` interface, `HttpApiClient.js` real calls, `MockApiClient.js` fake data. **The only place the UI touches data.**
- `models/` Session, Timetable, ChangeRequest. `components/` SessionCard, TimetableGrid. `views/` one class per role. `App.js` shell.

## API your backend must provide (base `/api`, JSON, cookie auth)
| Method + path | Returns / body |
|---|---|
| GET `/meta` | `{levels:[{name, groups:[string]}], doctors:[string]}` |
| GET `/timetable` | `Session[]` = `{id, course, kind:'lecture'\|'section', room, doctor, groups:[string], day:0-5, period:0-4, requestStatus:null\|'pending'\|'approved'\|'rejected'}` |
| GET `/stats` | `{placed, total, conflicts, studentGaps, attempts}` |
| POST `/demo-data`, POST `/timetable/generate` | `{ok:true}` (generate must run the independent conflict check) |
| POST `/import` (multipart `file`) | `{ok:true}` (sheet names per CLAUDE.md section 7) |
| GET `/requests?doctor=` | `[{id, doctor, reason, status, session:Session}]` |
| POST `/requests` | body `{sessionId, doctor, reason}` |
| PATCH `/requests/:id` | body `{decision:'approved'\|'rejected'}`; approved => the session shows as cancelled, then notify students |

## Backend to-do
Real login (role from the account, remove the demo role switcher), department-head approval step, version log + rollback, notifications.
