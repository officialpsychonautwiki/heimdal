#![feature(plugin)]
#![plugin(rocket_codegen)]

extern crate rocket;
#[macro_use] extern crate rocket_contrib;
#[macro_use] extern crate lazy_static;

extern crate rand;
extern crate redis;

use rocket::http::{Cookie, Cookies};

use rand::Rng;

#[cfg(test)] mod tests;

use rocket::http::{Status, ContentType};
use rocket::Outcome;
use rocket::request::{self, Request, FromRequest};
use rocket::response::content::JavaScript;
use rocket::Response;
use rocket_contrib::{Json, Value};

use std::io::Cursor;
use std::env;

use rocket::response::Redirect;

use redis::Commands;

lazy_static! {
    static ref SMALL_GIF: Vec<u8> = vec![
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x1, 0x0,
        0x1, 0x0, 0x80, 0x0, 0x0, 0xff, 0xff, 0xff,
        0x0, 0x0, 0x0, 0x21, 0xf9, 0x4, 0x1, 0x0,
        0x0, 0x0, 0x0, 0x2c, 0x0, 0x0, 0x0, 0x0,
        0x1, 0x0, 0x1, 0x0, 0x0, 0x2, 0x2, 0x44,
        0x1, 0x0, 0x3b
    ];
}

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

/* Track sid and cid tuples */
#[get("/b/<sid>/<cid>")]
fn beacon<'a>(sid: String, cid: String) -> Response<'a> {
    Response::build()
        .sized_body(Cursor::new(SMALL_GIF.clone()))
        .status(Status::Ok)
        .header(ContentType::GIF)
        .finalize()
}

#[get("/s/<sid>/s.js")]
fn recover(sid: String) -> JavaScript<String> {
    //JavaScript(format!("window._sco=function(c){{var x=document.createElement('img');x.src='/u/b/{}/'+c;document.body.appendChild(x)}}", sid))
    JavaScript(format!("window._sci={:?}", sid))
}

struct RefKey(String);

impl<'a, 'r> FromRequest<'a, 'r> for RefKey {
    type Error = ();

    fn from_request(request: &'a Request<'r>) -> request::Outcome<RefKey, ()> {
        // let keys: Vec<_> = request.headers().get("x-api-key").collect();
        // if keys.len() != 1 {
        //     return Outcome::Failure((Status::BadRequest, ()));
        // }

        // let key = keys[0];
        // if !is_valid(keys[0]) {
        //     return Outcome::Forward(());
        // }

        let random_id =
            rand::thread_rng()
                .gen_ascii_chars()
                .take(32)
                .collect::<String>();

        if let Some(cookie) = request.cookies().get("_sri") {
            println!("{:?}", cookie);

            let rust_url = env::var("RUST_URL").unwrap_or("redis://127.0.0.1/".to_string());

            match redis::Client::open(rust_url.as_str()) {
                Ok(client) => {
                    match client.get_connection() {
                        Ok(conn) => {
                            let sri_redis_val: Result<String, _> = conn.get(cookie.value());

                            match sri_redis_val {
                                Ok(sri) => {
                                    return Outcome::Success(RefKey(sri));
                                },
                                _ => {
                                    let _: Result<String, _> = conn.set(cookie.value(), &random_id);
                                }
                            }
                        }, _ => {}
                    }
                }, _ => {}
            }
        }

        Outcome::Success(RefKey(random_id))
    }
}

#[get("/r")]
fn auth(sid: RefKey) -> Redirect {
    println!("{:?}", sid.0);
    Redirect::moved(
        format!("/u/s/{}/s.js", sid.0).as_str()
    )
}

#[get("/r/<cid>")]
fn cid_register(mut jar: Cookies, cid: String) -> () {
    let cookie = Cookie::build("_sri", cid.to_string())
        .path("/u")
        .secure(true)
        .finish();

    jar.add(cookie);

    ()
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
        .mount("/", routes![beacon, cid_register, recover, auth])
        .catch(errors![not_found])
        .launch();
}