# Google Calendar MCP Server - Security Review

**Date:** 2025-12-24  
**Reviewer:** Security Analysis  
**Version:** 2.2.0

## Executive Summary

The Google Calendar MCP server demonstrates good security practices in several areas but has **5 dependency vulnerabilities** that should be addressed. The server includes proper token storage permissions, localhost restrictions for HTTP mode, and input validation. However, the identified vulnerabilities (2 moderate, 3 high severity) require attention.

## Critical Findings

### 🔴 HIGH SEVERITY VULNERABILITIES

#### 1. @modelcontextprotocol/sdk - DNS Rebinding Protection
- **Severity:** HIGH
- **Issue:** MCP TypeScript SDK does not enable DNS rebinding protection by default
- **Advisory:** [GHSA-w48q-cv73-mx4w](https://github.com/advisories/GHSA-w48q-cv73-mx4w)
- **Status:** Dependency vulnerability
- **Impact:** Potential DNS rebinding attacks in HTTP mode
- **Mitigation:** 
  - Server already implements localhost origin validation (`isLocalhostOrigin()`)
  - HTTP mode restricted to `127.0.0.1` by default
  - Use stdio mode in production (recommended)
- **Recommendation:** Update dependency when fix available, or ensure HTTP mode only used in trusted environments

#### 2. glob - Command Injection
- **Severity:** HIGH  
- **Issue:** Command injection via -c/--cmd executes matches with shell:true
- **Advisory:** [GHSA-5j98-mcp5-4vw2](https://github.com/advisories/GHSA-5j98-mcp5-4vw2)
- **Status:** Dependency vulnerability
- **Impact:** Potential command injection if glob is used with user input
- **Recommendation:** Run `npm audit fix` to update to patched version

#### 3. jws - HMAC Signature Verification
- **Severity:** HIGH
- **Issue:** Improperly verifies HMAC signature
- **Advisory:** [GHSA-869p-cjfg-cm3x](https://github.com/advisories/GHSA-869p-cjfg-cm3x)
- **Status:** Dependency vulnerability
- **Impact:** Potential authentication bypass if JWT tokens are used improperly
- **Recommendation:** Update dependency (likely transitive dependency)

### 🟡 MODERATE SEVERITY VULNERABILITIES

#### 4. body-parser - Denial of Service
- **Severity:** MODERATE
- **Issue:** Vulnerable to DoS when URL encoding is used
- **Advisory:** [GHSA-wqch-xfxh-vrr4](https://github.com/advisories/GHSA-wqch-xfxh-vrr4)
- **Status:** Dependency vulnerability
- **Impact:** Potential DoS attacks via malicious URL-encoded requests
- **Mitigation:** Server implements 10MB request size limit
- **Recommendation:** Update dependency when fix available

#### 5. vite - Multiple Issues
- **Severity:** MODERATE
- **Issues:** 
  - Middleware may serve files starting with same name as public directory
  - `server.fs` settings not applied to HTML files
  - `server.fs.deny` bypass via backslash on Windows
- **Status:** Development dependency (lower risk)
- **Impact:** File system access issues in development
- **Recommendation:** Update vite (development dependency only)

## Security Strengths

### ✅ Token Storage Security
- **File Permissions:** Tokens stored with mode `0o600` (owner read/write only)
- **Storage Location:** `~/.config/google-calendar-mcp/tokens.json` (user directory)
- **Token Encryption:** Tokens stored in plain JSON (acceptable for local storage with proper file permissions)
- **Token Refresh:** Automatic refresh before expiry with 5-minute buffer
- **Race Condition Protection:** Write queue prevents concurrent token file modifications

### ✅ HTTP Transport Security
- **Localhost Restriction:** HTTP mode binds to `127.0.0.1` by default (not `0.0.0.0`)
- **Origin Validation:** Proper URL parsing prevents DNS rebinding attacks
- **CORS:** Restricted to localhost origins only
- **Request Size Limits:** 10MB maximum request size
- **Security Headers:** CSP, X-Frame-Options, X-Content-Type-Options implemented
- **Host Header Protection:** Uses configured host/port instead of request headers

### ✅ Authentication & Authorization
- **OAuth 2.0:** Uses well-maintained `google-auth-library`
- **Scope Limitation:** Only requests `calendar` scope (principle of least privilege)
- **Multi-Account Support:** Proper account isolation
- **Token Validation:** Validates tokens before use, refreshes expired tokens

### ✅ Input Validation
- **Event ID Validation:** Validates event ID format
- **Account ID Validation:** Validates account IDs against allowed patterns
- **Field Validation:** Validates allowed event fields
- **JSON Parsing:** Proper error handling for malformed JSON

### ✅ Error Handling
- **No Sensitive Data Leakage:** Error messages don't expose tokens or credentials
- **Graceful Degradation:** Handles missing tokens, expired tokens, API errors

## Security Recommendations

### Immediate Actions

1. **Update Dependencies**
   ```bash
   cd mcp-servers/google-calendar
   npm audit fix
   ```
   Review changes and test thoroughly after updates.

2. **Verify HTTP Mode Restrictions**
   - Confirm HTTP mode only used in development/testing
   - Use stdio mode for production deployments
   - Document that HTTP mode should not be exposed to network

3. **Review glob Usage**
   - Check if glob package is directly used with user input
   - If used, ensure input sanitization
   - Update to patched version

### Best Practices

1. **Credential Management**
   - ✅ Already uses environment variables for credential paths
   - ✅ Tokens stored with restricted permissions
   - ⚠️ Consider adding option for encrypted token storage for sensitive deployments

2. **Network Security**
   - ✅ HTTP mode restricted to localhost
   - ⚠️ Consider HTTPS for HTTP mode if exposed (not recommended - use stdio instead)

3. **Audit Logging**
   - Consider adding audit logging for sensitive operations (token refresh, account changes)
   - Log authentication failures for security monitoring

4. **Rate Limiting**
   - Consider adding rate limiting for API calls to prevent abuse
   - Google Calendar API has its own rate limits, but client-side limiting adds defense in depth

5. **Token Expiration Monitoring**
   - ✅ Automatic token refresh implemented
   - Consider alerting/logging when tokens cannot be refreshed

## Risk Assessment

### Production Use (stdio mode)
- **Risk Level:** LOW to MEDIUM
- **Justification:** 
  - stdio mode has no network exposure
  - Token storage is properly secured
  - Dependency vulnerabilities are mitigated by local-only access
- **Recommendation:** Update dependencies before production deployment

### Development Use (HTTP mode)
- **Risk Level:** LOW (with restrictions)
- **Justification:**
  - Localhost-only binding prevents network access
  - Origin validation prevents DNS rebinding
  - Request size limits prevent DoS
- **Recommendation:** Only use in trusted development environments, never expose to network

### Dependency Vulnerabilities
- **Risk Level:** MEDIUM (requires update)
- **Justification:**
  - Some vulnerabilities may be transitive dependencies
  - Updates available via `npm audit fix`
  - Some vulnerabilities mitigated by server design (localhost restrictions)

## Compliance Considerations

### Data Protection
- **Token Storage:** Tokens stored locally with restricted permissions ✅
- **Data Transmission:** Uses Google OAuth 2.0 (industry standard) ✅
- **Scope Limitation:** Only calendar scope requested (minimal permissions) ✅

### Access Control
- **Authentication:** OAuth 2.0 flow required ✅
- **Authorization:** Google handles authorization ✅
- **Token Management:** Automatic refresh, proper expiration handling ✅

## Testing Recommendations

1. **Security Testing**
   - Test localhost origin validation with various malformed origins
   - Test request size limits
   - Test token refresh failure scenarios
   - Test multi-account isolation

2. **Dependency Testing**
   - Test after `npm audit fix` to ensure no breaking changes
   - Verify glob usage doesn't expose command injection
   - Test JWT handling if jws is used

## Conclusion

The Google Calendar MCP server demonstrates solid security practices with proper token storage, localhost restrictions, and input validation. The primary concern is the **5 dependency vulnerabilities** which should be addressed by running `npm audit fix`. The server's design mitigates many risks through localhost-only HTTP mode and proper permission handling.

**Overall Security Rating:** ⚠️ **GOOD with minor issues** (requires dependency updates)

**Recommended Action:** Update dependencies, then deploy with stdio mode for production use.

