import uuid
import datetime
import pytest
import jwt
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import Settings, settings
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.models.user import RoleEnum


@pytest.mark.asyncio
async def test_fix1_role_privilege_escalation_prevention():
    """
    Fix 1:
    - Attempt to register new user with ADMIN and SUPER_ADMIN.
    - Verify that requests are rejected with HTTP 400 and do not create privileged users.
    - Verify that legitimate BUYER, CUSTOMER, VENDOR registration succeeds.
    - Verify that authorized administrator provisioning remains functional.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        rand_id1 = f"+9199{uuid.uuid4().hex[:8]}"
        rand_id2 = f"+9199{uuid.uuid4().hex[:8]}"

        # 1. Attempt public registration with ADMIN (must fail with 400)
        res_admin = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": rand_id1,
            "otp_code": "123456",
            "full_name": "Malicious Attacker",
            "role": "ADMIN"
        })
        assert res_admin.status_code == 400
        assert "Privileged administrative roles cannot be assigned" in res_admin.json()["detail"]

        # 2. Attempt public registration with SUPER_ADMIN (must fail with 400)
        res_super = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": rand_id2,
            "otp_code": "123456",
            "full_name": "Malicious Attacker",
            "role": "SUPER_ADMIN"
        })
        assert res_super.status_code == 400
        assert "Privileged administrative roles cannot be assigned" in res_super.json()["detail"]

        # 3. Legitimate BUYER registration succeeds
        buyer_id = f"+9197{uuid.uuid4().hex[:8]}"
        res_buyer = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": buyer_id,
            "otp_code": "123456",
            "full_name": "Legitimate Buyer",
            "role": "BUYER"
        })
        assert res_buyer.status_code == 200
        assert res_buyer.json()["role"] == "BUYER"

        # 4. Legitimate VENDOR registration succeeds
        vendor_id = f"+9197{uuid.uuid4().hex[:8]}"
        res_vendor = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": vendor_id,
            "otp_code": "123456",
            "full_name": "Legitimate Vendor",
            "role": "VENDOR"
        })
        assert res_vendor.status_code == 200
        assert res_vendor.json()["role"] == "VENDOR"

        # 5. Pre-seeded platform admin login retains ADMIN role
        admin_login = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": "+919800099999",
            "otp_code": "123456",
            "role": "ADMIN"
        })
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["access_token"]
        assert admin_login.json()["role"] == "ADMIN"

        # 6. Authorized admin provisioning endpoint creates valid administrator
        new_admin_id = f"admin.{uuid.uuid4().hex[:6]}@noryvantaglobal.com"
        prov_res = await ac.post(
            "/api/v1/admin/users/provision",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "email": new_admin_id,
                "full_name": "Secondary Compliance Admin",
                "role": "ADMIN"
            }
        )
        assert prov_res.status_code == 200
        assert prov_res.json()["success"] is True
        assert prov_res.json()["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_fix2_jwt_token_type_separation():
    """
    Fix 2:
    - Valid access token succeeds on protected endpoint.
    - Refresh token used as Bearer access token is strictly rejected with HTTP 401.
    - Expired, tampered, missing-type, and invalid-type tokens are rejected.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        user_phone = f"+9196{uuid.uuid4().hex[:8]}"
        login_res = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": user_phone,
            "otp_code": "123456",
            "role": "BUYER"
        })
        assert login_res.status_code == 200
        tokens = login_res.json()
        access_tok = tokens["access_token"]
        # In Phase 5, browser endpoint NEVER returns refresh token in JSON
        assert tokens.get("refresh_token") is None
        refresh_tok = login_res.cookies.get("noryvanta_refresh_token")
        assert refresh_tok is not None

        # 1. Valid access token succeeds
        valid_res = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_tok}"})
        assert valid_res.status_code == 200

        # 2. Refresh token used as Bearer access token returns HTTP 401
        type_confuse_res = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {refresh_tok}"})
        assert type_confuse_res.status_code == 401
        assert "Token type must be 'access'" in type_confuse_res.json()["detail"]

        # 3. Token with missing type claim returns HTTP 401
        no_type_jwt = jwt.encode({"sub": "test-user"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        no_type_res = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {no_type_jwt}"})
        assert no_type_res.status_code == 401

        # 4. Token with invalid type claim returns HTTP 401
        bad_type_jwt = jwt.encode({"sub": "test-user", "type": "id_token"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        bad_type_res = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {bad_type_jwt}"})
        assert bad_type_res.status_code == 401

        # 5. Tampered signature returns HTTP 401
        tampered_jwt = jwt.encode({"sub": "test-user", "type": "access"}, "malicious-fake-secret-key-at-least-32-chars-long", algorithm="HS256")
        tampered_res = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tampered_jwt}"})
        assert tampered_res.status_code == 401

        # 6. Expired token returns HTTP 401
        exp_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=10)
        expired_jwt = jwt.encode({"sub": "test-user", "type": "access", "exp": exp_time}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        expired_res = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_jwt}"})
        assert expired_res.status_code == 401


def test_fix3_production_secret_validation():
    """
    Fix 3:
    - Production configuration with default or weak secret fails safely.
    - Production configuration with strong secret passes.
    - Development configuration works smoothly.
    """
    # 1. Production with hardcoded default key must raise ValueError
    with pytest.raises(ValueError, match="CRITICAL SECURITY CONFIGURATION ERROR"):
        Settings(
            APP_ENV="production",
            SECRET_KEY="noryvanta-sovereign-commerce-ultra-secure-key-2026"
        )

    # 2. Production with short secret (< 32 chars) must raise ValueError
    with pytest.raises(ValueError, match="CRITICAL SECURITY CONFIGURATION ERROR"):
        Settings(
            APP_ENV="production",
            SECRET_KEY="short-secret-key"
        )

    # 3. Production with strong unique secret (>= 32 chars) succeeds
    prod_valid = Settings(
        APP_ENV="production",
        SECRET_KEY="a-very-strong-production-secret-key-with-64-random-entropy-bytes-ok!"
    )
    assert prod_valid.APP_ENV == "production"

    # 4. Development mode allows development defaults safely
    dev_settings = Settings(
        APP_ENV="development",
        SECRET_KEY="noryvanta-sovereign-commerce-ultra-secure-key-2026"
    )
    assert dev_settings.APP_ENV == "development"


@pytest.mark.asyncio
async def test_fix4_session_tracking_and_logout_revocation():
    """
    Fix 4 & Phase 3:
    - UserSession tracks refresh token hashes.
    - Logout revokes the session in the database.
    - Immediate access token invalidation: the access token issued before logout is now rejected with HTTP 401.
    - Revoked refresh token cannot obtain fresh access tokens.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        phone_user = f"+9195{uuid.uuid4().hex[:8]}"
        login_res = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": phone_user,
            "otp_code": "123456",
            "role": "BUYER"
        })
        tokens = login_res.json()
        access_tok = tokens["access_token"]
        refresh_tok = login_res.cookies.get("noryvanta_refresh_token")
        assert refresh_tok is not None

        # 1. Rotate before logout works via cookie
        ref_res1 = await ac.post(
            "/api/v1/auth/refresh",
            json={},
            headers={"Origin": "http://localhost:3000"}
        )
        assert ref_res1.status_code == 200
        new_access_tok = ref_res1.json()["access_token"]
        new_refresh_tok = ref_res1.cookies.get("noryvanta_refresh_token")
        assert new_refresh_tok is not None

        # Verify access token works on /me before logout
        me_before = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {new_access_tok}"})
        assert me_before.status_code == 200

        # 2. Logout with access token revokes the session
        logout_res = await ac.post(
            "/api/v1/auth/logout",
            headers={
                "Authorization": f"Bearer {new_access_tok}",
                "Origin": "http://localhost:3000"
            },
            json={"refresh_token": new_refresh_tok}
        )
        assert logout_res.status_code == 200
        assert logout_res.json()["success"] is True

        # 3. Attempting to refresh with the revoked token must return HTTP 401
        ref_after_logout = await ac.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": new_refresh_tok},
            headers={"Origin": "http://localhost:3000"}
        )
        assert ref_after_logout.status_code == 401
        assert "revoked" in ref_after_logout.json()["detail"].lower()

        # 4. Immediate access token invalidation: access token issued before logout is immediately rejected!
        me_after_logout = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {new_access_tok}"})
        assert me_after_logout.status_code == 401
        assert "revoked" in me_after_logout.json()["detail"].lower()


@pytest.mark.asyncio
async def test_fix5_real_password_authentication():
    """
    Fix 5:
    - Verifies real email and password login endpoint.
    - Correct password authenticates and returns valid JWT.
    - Incorrect password returns generic HTTP 401.
    - Non-existent user returns generic HTTP 401.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.get("/api/v1/health")

        # 1. Valid password login with seeded vendor (browser endpoint never returns refresh_token in JSON)
        valid_login = await ac.post("/api/v1/auth/login/password", json={
            "email": "vendor@noryvantaglobal.com",
            "password": "Password123!",
            "client_type": "mobile"
        })
        assert valid_login.status_code == 200
        data = valid_login.json()
        assert "access_token" in data
        assert data.get("refresh_token") is None
        assert "noryvanta_refresh_token" in valid_login.cookies
        assert data["role"] == "VENDOR"

        # Verify access token works on /me
        me_res = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {data['access_token']}"})
        assert me_res.status_code == 200
        assert me_res.json()["email"] == "vendor@noryvantaglobal.com"

        # 2. Invalid password returns generic 401
        bad_pw_res = await ac.post("/api/v1/auth/login/password", json={
            "email": "vendor@noryvantaglobal.com",
            "password": "WrongPassword999!"
        })
        assert bad_pw_res.status_code == 401
        assert bad_pw_res.json()["detail"] == "Invalid email or password."

        # 3. Unknown email returns generic 401
        unknown_res = await ac.post("/api/v1/auth/login/password", json={
            "email": "nonexistent@noryvantaglobal.com",
            "password": "Password123!"
        })
        assert unknown_res.status_code == 401
        assert unknown_res.json()["detail"] == "Invalid email or password."


@pytest.mark.asyncio
async def test_fix6_httponly_cookie_token_delivery():
    """
    Fix 6:
    - Login sets HttpOnly refresh token cookie.
    - /refresh endpoint can extract refresh token from cookie.
    - /logout clears the cookie.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        phone = f"+9194{uuid.uuid4().hex[:8]}"
        res = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": phone,
            "otp_code": "123456",
            "role": "BUYER"
        })
        assert res.status_code == 200
        cookies = res.cookies
        assert "noryvanta_refresh_token" in cookies
        # Browser client does NOT receive refresh_token in JSON body!
        assert res.json().get("refresh_token") is None
        access_tok = res.json()["access_token"]

        # 2. Refresh without body using cookie
        refresh_cookie_res = await ac.post(
            "/api/v1/auth/refresh",
            json={},
            headers={"Origin": "http://localhost:3000"}
        )
        assert refresh_cookie_res.status_code == 200
        assert "access_token" in refresh_cookie_res.json()
        assert "noryvanta_refresh_token" in refresh_cookie_res.cookies

        # 3. Logout clears cookie
        logout_res = await ac.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {access_tok}", "Origin": "http://localhost:3000"}
        )
        assert logout_res.status_code == 200
        assert "noryvanta_refresh_token" in logout_res.headers.get("set-cookie", "")


@pytest.mark.asyncio
async def test_fix_f01_browser_refresh_token_isolation():
    """
    P0 — Fix F-01:
    - Standard browser authentication endpoints NEVER expose refresh tokens in JSON.
    - Setting client_type='mobile', 'app', or 'native' in payload CANNOT bypass this.
    - Setting X-Client-Type: mobile, app, or native in headers CANNOT bypass this.
    - Refresh tokens are delivered to browsers exclusively via HttpOnly cookies.
    - Dedicated native mobile routes (/api/v1/customer/auth/*) properly return refresh tokens in JSON.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Standard browser request
        p1 = f"+9193{uuid.uuid4().hex[:8]}"
        res1 = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": p1,
            "otp_code": "123456",
            "role": "BUYER"
        })
        assert res1.status_code == 200
        assert res1.json().get("refresh_token") is None
        assert "noryvanta_refresh_token" in res1.cookies

        # 2. Spoofed payload client_type='mobile' MUST NOT return refresh token in JSON
        p2 = f"+9193{uuid.uuid4().hex[:8]}"
        res2 = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": p2,
            "otp_code": "123456",
            "role": "CUSTOMER",
            "client_type": "mobile"
        })
        assert res2.status_code == 200
        assert res2.json().get("refresh_token") is None
        assert "noryvanta_refresh_token" in res2.cookies

        # 3. Spoofed payload client_type='native' and 'app'
        for spoofed in ("native", "app"):
            p_sp = f"+9193{uuid.uuid4().hex[:8]}"
            res_sp = await ac.post("/api/v1/auth/otp/verify", json={
                "identifier": p_sp,
                "otp_code": "123456",
                "role": "CUSTOMER",
                "client_type": spoofed
            })
            assert res_sp.status_code == 200
            assert res_sp.json().get("refresh_token") is None

        # 4. Spoofed header X-Client-Type: mobile / native / app
        for spoof_hdr in ("mobile", "native", "app"):
            p_hdr = f"+9193{uuid.uuid4().hex[:8]}"
            res_hdr = await ac.post(
                "/api/v1/auth/otp/verify",
                headers={"X-Client-Type": spoof_hdr},
                json={"identifier": p_hdr, "otp_code": "123456", "role": "CUSTOMER"}
            )
            assert res_hdr.status_code == 200
            assert res_hdr.json().get("refresh_token") is None

        # 5. Browser refresh endpoint NEVER returns refresh token in JSON
        ref_browser = await ac.post(
            "/api/v1/auth/refresh",
            json={"client_type": "mobile"},
            headers={"X-Client-Type": "mobile", "Origin": "http://localhost:3000"}
        )
        assert ref_browser.status_code == 200
        assert ref_browser.json().get("refresh_token") is None
        assert "noryvanta_refresh_token" in ref_browser.cookies

        # 6. Dedicated native customer mobile routes DO provide JSON tokens for native apps
        p_native = f"+9193{uuid.uuid4().hex[:8]}"
        native_verify = await ac.post("/api/v1/customer/auth/verify-otp", json={
            "phone_or_email": p_native,
            "otp_code": "123456"
        })
        assert native_verify.status_code == 200
        native_tokens = native_verify.json()
        assert native_tokens.get("access_token") is not None
        assert native_tokens.get("refresh_token") is not None

        # 7. Dedicated native mobile refresh rotates and returns JSON tokens
        native_refresh = await ac.post("/api/v1/customer/auth/refresh", json={
            "refresh_token": native_tokens["refresh_token"]
        })
        assert native_refresh.status_code == 200
        refreshed_data = native_refresh.json()
        assert refreshed_data.get("access_token") is not None
        assert refreshed_data.get("refresh_token") is not None
        assert refreshed_data["refresh_token"] != native_tokens["refresh_token"]

        # 8. Dedicated native mobile logout
        native_logout = await ac.post(
            "/api/v1/customer/auth/logout",
            headers={"Authorization": f"Bearer {refreshed_data['access_token']}"},
            json={"refresh_token": refreshed_data["refresh_token"]}
        )
        assert native_logout.status_code == 200
        assert native_logout.json()["success"] is True


@pytest.mark.asyncio
async def test_fix_f02_strict_cookie_csrf_validation():
    """
    P0 — Fix F-02:
    - Complete CSRF matrix:
      1. Trusted Origin -> 200
      2. Untrusted Origin -> 403
      3. Missing Origin and Referer -> 403
      4. Trusted Origin + Untrusted Referer -> 403
      5. Missing Origin + Trusted Referer -> 200
      6. Missing Origin + Untrusted Referer -> 403
      7. Malformed Origin or Referer -> 403
      8. Cookie + spoofed mobile header -> 403 (cannot bypass CSRF)
      9. Cookie + spoofed mobile payload -> 403 (cannot bypass CSRF)
      10. Cookie-less native Bearer request -> 200 (not broken)
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        phone = f"+9192{uuid.uuid4().hex[:8]}"
        login_res = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": phone,
            "otp_code": "123456",
            "role": "BUYER"
        })
        assert login_res.status_code == 200
        access_tok = login_res.json()["access_token"]
        assert "noryvanta_refresh_token" in login_res.cookies

        # Case 1: Trusted Origin alone
        res_trusted = await ac.post(
            "/api/v1/auth/refresh",
            json={},
            headers={"Origin": "https://noryvantaglobal.com"}
        )
        assert res_trusted.status_code == 200

        # Case 2: Untrusted Origin
        res_evil_orig = await ac.post(
            "/api/v1/auth/refresh",
            json={},
            headers={"Origin": "https://attacker-site.com"}
        )
        assert res_evil_orig.status_code == 403
        assert "CSRF protection" in res_evil_orig.json()["detail"]

        # Case 3: Missing both Origin and Referer
        res_no_headers = await ac.post(
            "/api/v1/auth/refresh",
            json={}
        )
        assert res_no_headers.status_code == 403
        assert "Origin or Referer header required" in res_no_headers.json()["detail"]

        # Case 4: Trusted Origin plus untrusted Referer (mismatch)
        res_mismatch = await ac.post(
            "/api/v1/auth/refresh",
            json={},
            headers={
                "Origin": "https://noryvantaglobal.com",
                "Referer": "https://malicious-site.com/attack"
            }
        )
        assert res_mismatch.status_code == 403
        assert "CSRF protection" in res_mismatch.json()["detail"]

        # Case 5: Missing Origin plus trusted Referer
        res_trusted_ref = await ac.post(
            "/api/v1/auth/refresh",
            json={},
            headers={"Referer": "https://noryvantaglobal.com/dashboard/account"}
        )
        assert res_trusted_ref.status_code == 200

        # Case 6: Missing Origin plus untrusted Referer
        res_evil_ref = await ac.post(
            "/api/v1/auth/refresh",
            json={},
            headers={"Referer": "https://phishing-site.org/redirect"}
        )
        assert res_evil_ref.status_code == 403

        # Case 7: Malformed Origin
        for bad_orig in ("null", "javascript:alert(1)", "://bad-url", "ftp://noryvantaglobal.com"):
            res_bad = await ac.post(
                "/api/v1/auth/refresh",
                json={},
                headers={"Origin": bad_orig}
            )
            assert res_bad.status_code == 403

        # Case 8: Cookie plus spoofed mobile header (X-Client-Type: mobile) cannot bypass CSRF
        res_spoof_hdr = await ac.post(
            "/api/v1/auth/refresh",
            json={},
            headers={"X-Client-Type": "mobile", "Origin": "https://evil.com"}
        )
        assert res_spoof_hdr.status_code == 403

        # Case 9: Cookie plus spoofed mobile payload (client_type: mobile) cannot bypass CSRF
        res_spoof_payload = await ac.post(
            "/api/v1/auth/refresh",
            json={"client_type": "mobile"}
        )
        assert res_spoof_payload.status_code == 403

        # Case 10: Cookie-less native Bearer request is NOT broken by CSRF validation
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac_native:
            # ac_native has no cookies
            native_login = await ac_native.post("/api/v1/customer/auth/verify-otp", json={
                "phone_or_email": f"+9198{uuid.uuid4().hex[:8]}",
                "otp_code": "123456"
            })
            native_tok = native_login.json()["access_token"]
            native_ref = native_login.json()["refresh_token"]

            # Native customer logout with Bearer token and NO cookies succeeds without Origin/Referer
            res_native_logout = await ac_native.post(
                "/api/v1/customer/auth/logout",
                headers={"Authorization": f"Bearer {native_tok}"},
                json={"refresh_token": native_ref}
            )
            assert res_native_logout.status_code == 200


@pytest.mark.asyncio
async def test_fix_f04_strict_session_binding_and_invalidation():
    """
    P1 — Fix F-04:
    - Newly issued access tokens strictly contain type='access' and 'sid'.
    - Tokens missing 'sid' are rejected with HTTP 401.
    - Tokens with unknown / nonexistent 'sid' are rejected with HTTP 401.
    - Tokens with 'sid' belonging to another user are rejected with HTTP 401.
    - Tokens tied to revoked sessions are rejected with HTTP 401.
    - Tokens tied to expired sessions are rejected with HTTP 401.
    - Valid active session succeeds.
    - Single-device logout invalidates only the revoked device; other devices remain operational.
    """
    from app.core.database import AsyncSessionLocal
    from app.models.user import User, UserSession
    from app.core.security import hash_token
    from datetime import datetime, timezone, timedelta

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        phone_u1 = f"+9191{uuid.uuid4().hex[:8]}"
        res_u1 = await ac.post("/api/v1/auth/otp/verify", json={
            "identifier": phone_u1,
            "otp_code": "123456",
            "role": "BUYER"
        })
        tok_u1 = res_u1.json()["access_token"]
        decoded_u1 = decode_token(tok_u1)

        # 1. Access token has type='access' and valid 'sid'
        assert decoded_u1.get("type") == "access"
        assert decoded_u1.get("sid") is not None
        valid_sid = decoded_u1["sid"]
        user1_id = decoded_u1["sub"]

        # Valid session succeeds on protected /me
        assert (await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tok_u1}"})).status_code == 200

        # 2. Token missing 'sid' claim -> 401
        no_sid_jwt = jwt.encode(
            {"sub": user1_id, "type": "access", "exp": datetime.now(timezone.utc) + timedelta(minutes=15)},
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        res_no_sid = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {no_sid_jwt}"})
        assert res_no_sid.status_code == 401
        assert "missing session binding" in res_no_sid.json()["detail"].lower()

        # 3. Token with unknown / fake 'sid' -> 401
        fake_sid_jwt = jwt.encode(
            {"sub": user1_id, "type": "access", "sid": str(uuid.uuid4()), "exp": datetime.now(timezone.utc) + timedelta(minutes=15)},
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        res_fake_sid = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {fake_sid_jwt}"})
        assert res_fake_sid.status_code == 401
        assert "session not found" in res_fake_sid.json()["detail"].lower()

        # 4. Token with 'sid' belonging to a DIFFERENT user -> 401
        async with AsyncSessionLocal() as db:
            other_user = User(email=f"other_{uuid.uuid4().hex[:6]}@test.com", full_name="Other User")
            db.add(other_user)
            await db.commit()
            await db.refresh(other_user)

            other_session = UserSession(
                user_id=other_user.id,
                refresh_token_hash=hash_token("fake-refresh-token"),
                expires_at=datetime.now(timezone.utc) + timedelta(days=30)
            )
            db.add(other_session)
            await db.commit()
            await db.refresh(other_session)
            other_session_id = other_session.id

        mismatched_jwt = jwt.encode(
            {"sub": user1_id, "type": "access", "sid": other_session_id, "exp": datetime.now(timezone.utc) + timedelta(minutes=15)},
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        res_mismatch = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {mismatched_jwt}"})
        assert res_mismatch.status_code == 401
        assert "does not match" in res_mismatch.json()["detail"].lower()

        # 5. Token with revoked session -> 401
        async with AsyncSessionLocal() as db:
            rev_session = UserSession(
                user_id=user1_id,
                refresh_token_hash=hash_token("revoked-token"),
                is_revoked=True,
                expires_at=datetime.now(timezone.utc) + timedelta(days=30)
            )
            db.add(rev_session)
            await db.commit()
            await db.refresh(rev_session)
            rev_sid = rev_session.id

        rev_jwt = jwt.encode(
            {"sub": user1_id, "type": "access", "sid": rev_sid, "exp": datetime.now(timezone.utc) + timedelta(minutes=15)},
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        res_rev = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {rev_jwt}"})
        assert res_rev.status_code == 401
        assert "revoked" in res_rev.json()["detail"].lower()

        # 6. Token with expired session -> 401
        async with AsyncSessionLocal() as db:
            exp_session = UserSession(
                user_id=user1_id,
                refresh_token_hash=hash_token("exp-token"),
                is_revoked=False,
                expires_at=datetime.now(timezone.utc) - timedelta(minutes=5)
            )
            db.add(exp_session)
            await db.commit()
            await db.refresh(exp_session)
            exp_sid = exp_session.id

        exp_jwt = jwt.encode(
            {"sub": user1_id, "type": "access", "sid": exp_sid, "exp": datetime.now(timezone.utc) + timedelta(minutes=15)},
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        res_exp = await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {exp_jwt}"})
        assert res_exp.status_code == 401
        assert "expired" in res_exp.json()["detail"].lower()

        # 7. Multi-device independent logout: Device A logout does NOT invalidate Device B
        phone_dual = f"+9190{uuid.uuid4().hex[:8]}"
        res_dev_a = await ac.post("/api/v1/auth/otp/verify", json={"identifier": phone_dual, "otp_code": "123456", "role": "BUYER"})
        tok_dev_a = res_dev_a.json()["access_token"]
        ref_dev_a = res_dev_a.cookies.get("noryvanta_refresh_token")

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac_b:
            res_dev_b = await ac_b.post("/api/v1/auth/otp/verify", json={"identifier": phone_dual, "otp_code": "123456", "role": "BUYER"})
            tok_dev_b = res_dev_b.json()["access_token"]
            ref_dev_b = res_dev_b.cookies.get("noryvanta_refresh_token")

            # Both devices operational
            assert (await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tok_dev_a}"})).status_code == 200
            assert (await ac_b.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tok_dev_b}"})).status_code == 200

            # Logout Device A only
            logout_a = await ac.post(
                "/api/v1/auth/logout",
                headers={"Authorization": f"Bearer {tok_dev_a}", "Origin": "http://localhost:3000"},
                json={"refresh_token": ref_dev_a, "all_devices": False}
            )
            assert logout_a.status_code == 200

            # Device A is immediately revoked
            assert (await ac.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tok_dev_a}"})).status_code == 401

            # Device B remains active!
            assert (await ac_b.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tok_dev_b}"})).status_code == 200


def test_phase3_alembic_012_migration_upgrade_downgrade():
    """
    Phase 3:
    - Tests Alembic migration 012 on a temporary database.
    - Confirms upgrade head creates user_sessions table with indexes and constraints.
    - Confirms safe downgrade to 011 drops user_sessions.
    - Confirms re-upgrade to head is idempotent and clean.
    """
    import tempfile
    import os
    from alembic.config import Config
    from alembic import command
    import sqlite3

    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    try:
        cfg = Config("alembic.ini")
        cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")

        # Upgrade to head (includes 012)
        command.upgrade(cfg, "head")

        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_sessions'")
        assert cur.fetchone() is not None, "user_sessions table was not created by migration 012"

        # Check indexes
        cur.execute("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='user_sessions'")
        indexes = [row[0] for row in cur.fetchall()]
        assert any("refresh_token_hash" in idx for idx in indexes)
        assert any("user_id" in idx for idx in indexes)
        conn.close()

        # Downgrade to 011
        command.downgrade(cfg, "011_customer_mobile_and_reward_system")
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_sessions'")
        assert cur.fetchone() is None, "user_sessions table was not dropped by downgrade"
        conn.close()

        # Re-upgrade to head
        command.upgrade(cfg, "head")
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_sessions'")
        assert cur.fetchone() is not None
        conn.close()
    finally:
        import gc
        gc.collect()
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception:
                pass

