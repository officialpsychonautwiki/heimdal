#![feature(plugin)]
#![plugin(rocket_codegen)]

extern crate rocket;
#[macro_use] extern crate rocket_contrib;

extern crate time;

extern crate rand;

use rocket::http::{Cookie, Cookies};

use rand::Rng;

#[cfg(test)] mod tests;

use rocket::Outcome;
use rocket::request::{self, Request, FromRequest};
use rocket::response::content::JavaScript;
use rocket_contrib::{Json, Value};

use rocket::response::Redirect;

/*
    Algorithm

    1. user calls /u/r endpoint
    2. 301 redirect to /s/<a: random>/s.js
    3. user sets cookie with name _sci and
       value <b>
    5. user calls /u/r endpoint
    6. _sci cookie is detected and used to
       obtain <a'> using <b> from storage.
       If <b> is unknown, <a': random>.
       301 redirect to /s/<a'>/s.js
*/

#[get("/s/<sid>/s.js")]
fn recover(sid: String) -> JavaScript<String> {
    JavaScript(format!("window._sci={:?}", sid))
}

struct RefKey(String);

impl<'a, 'r> FromRequest<'a, 'r> for RefKey {
    type Error = ();

    fn from_request(request: &'a Request<'r>) -> request::Outcome<RefKey, ()> {
        let random_id =
            rand::thread_rng()
                .gen_ascii_chars()
                .take(32)
                .collect::<String>();

        if let Some(cookie) = request.cookies().get_private("_sri") {
            return Outcome::Success(RefKey(cookie.value().to_string()));
        }

        Outcome::Success(RefKey(random_id))
    }
}

#[get("/_")]
fn auth(sid: RefKey, mut jar: Cookies) -> Redirect {
    let cookie = Cookie::build("_sri", sid.0.to_string())
        .path("/")
        .secure(true)
        // 2038
        .expires(time::at(time::Timespec {
            sec: 2171239453i64,
            nsec: 0i32
        }))
        .finish();

    jar.add_private(cookie);

    Redirect::moved(
        format!("/s/{}/s.js", sid.0).as_str()
    )
}

#[error(404)]
fn not_found() -> Json<Value> {
    Json(json!({
        "status": "error",
        "reason": "Resource was not found."
    }))
}

fn main() {
    rocket::ignite()
        .mount("/", routes![recover, auth])
        .catch(errors![not_found])
        .launch();
}