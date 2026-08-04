from dataclasses import dataclass
import re


@dataclass(frozen=True)
class SecretRule:
    rule_id: str
    secret_type: str
    severity: str
    confidence: float
    pattern: re.Pattern[str]
    description: str
    attacker_impact: str
    consequence: str
    remediation: str
    provider: str | None = None
    provider_scope: str | None = None


def compile_rule(pattern: str) -> re.Pattern[str]:
    return re.compile(pattern, re.MULTILINE)


def create_rule(
    *,
    rule_id: str,
    finding_type: str,
    severity: str,
    confidence: float,
    pattern: re.Pattern[str],
    description: str,
    attacker_impact: str,
    consequence: str,
    remediation: str,
    provider: str | None = None,
    provider_scope: str | None = None,
) -> SecretRule:
    return SecretRule(
        rule_id=rule_id,
        secret_type=finding_type,
        severity=severity,
        confidence=confidence,
        pattern=pattern,
        description=description,
        attacker_impact=attacker_impact,
        consequence=consequence,
        remediation=remediation,
        provider=provider,
        provider_scope=provider_scope,
    )


SECRET_RULES: tuple[SecretRule, ...] = (
    create_rule(
        rule_id="aws-access-key-id",
        finding_type="AWS Access Key ID",
        severity="HIGH",
        confidence=0.95,
        pattern=compile_rule(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
        description="An AWS access key identifier was exposed.",
        attacker_impact="Attackers can pair it with a secret key to access AWS APIs.",
        consequence="Cloud resources, S3 data, IAM permissions, and billing can be abused.",
        remediation="Disable the access key, rotate credentials, and audit CloudTrail activity.",
        provider="Amazon Web Services (AWS)",
        provider_scope="The key identifier proves the AWS credential family, but permissions require authorized IAM review.",
    ),
    create_rule(
        rule_id="aws-secret-access-key",
        finding_type="AWS Secret Access Key",
        severity="CRITICAL",
        confidence=0.9,
        pattern=compile_rule(
            r"(?i)(?:aws(.{0,20})?(?:secret|private)?(.{0,20})?(?:key))\s*[:=]\s*[\"']?([A-Za-z0-9/+=]{40})"
        ),
        description="An AWS secret access key value was exposed.",
        attacker_impact="Attackers may authenticate directly to AWS services.",
        consequence="This can lead to infrastructure takeover, data theft, and financial loss.",
        remediation="Revoke the key immediately, rotate dependent secrets, and review IAM policy scope.",
        provider="Amazon Web Services (AWS)",
        provider_scope="The credential is AWS-specific; its attached IAM permissions cannot be determined passively.",
    ),
    create_rule(
        rule_id="github-token",
        finding_type="GitHub Token",
        severity="CRITICAL",
        confidence=0.94,
        pattern=compile_rule(
            r"\b((?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}|github_pat_[A-Za-z0-9_]{22,255})\b"
        ),
        description="A GitHub access token was exposed.",
        attacker_impact=(
            "Attackers can access repositories, workflows, packages, or organization resources "
            "depending on token scope."
        ),
        consequence="Source code theft, CI/CD compromise, and supply-chain injection may occur.",
        remediation="Revoke the token in GitHub, rotate dependent credentials, and review audit logs.",
        provider="GitHub",
        provider_scope="The token family is GitHub-specific; repository and organization scopes require authorized GitHub review.",
    ),
    create_rule(
        rule_id="openai-api-key",
        finding_type="OpenAI API Key",
        severity="HIGH",
        confidence=0.92,
        pattern=compile_rule(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{32,180}\b"),
        description="An OpenAI API key-like token was exposed.",
        attacker_impact="Attackers can spend quota, access model endpoints, or abuse the associated account.",
        consequence="Unexpected billing and data exposure through API usage may occur.",
        remediation="Revoke the key, create a new scoped key, and keep it server-side only.",
        provider="OpenAI",
        provider_scope="The key format identifies OpenAI; project permissions and remaining validity require provider-side review.",
    ),
    create_rule(
        rule_id="google-api-key",
        finding_type="Google API Key",
        severity="MEDIUM",
        confidence=0.82,
        pattern=compile_rule(r"\bAIza[0-9A-Za-z_-]{35}\b"),
        description="A Google API key was exposed in public content.",
        attacker_impact="Attackers can abuse enabled Google APIs if restrictions are missing.",
        consequence="Quota exhaustion, billing abuse, and unauthorized API calls may occur.",
        remediation=(
            "Restrict the key by HTTP referrer, IP, and API scope; rotate it if unrestricted; "
            "and move sensitive services server-side."
        ),
        provider="Google Cloud / Google Maps Platform",
        provider_scope="The format identifies a Google API key. Enabled Google APIs and restrictions require authorized Google Cloud Console review.",
    ),
    create_rule(
        rule_id="google-oauth-client-secret",
        finding_type="Google OAuth Client Secret",
        severity="HIGH",
        confidence=0.92,
        pattern=compile_rule(r"\bGOCS[A-Za-z0-9_-]{20,80}\b"),
        description="A Google OAuth client secret was exposed.",
        attacker_impact="Attackers may abuse the OAuth client identity when combined with a valid client ID and permitted redirect flow.",
        consequence="OAuth integrations, user trust, and application identity may be compromised.",
        remediation="Rotate the OAuth client secret in Google Cloud Console and keep it in server-side secret storage.",
        provider="Google Identity / OAuth 2.0",
        provider_scope="The prefix identifies a Google OAuth client secret; the associated client, redirect URIs, and status require provider-side review.",
    ),
    create_rule(
        rule_id="stripe-secret-key",
        finding_type="Stripe Secret Key",
        severity="CRITICAL",
        confidence=0.96,
        pattern=compile_rule(r"\b(?:sk_live|rk_live)_[A-Za-z0-9]{24,120}\b"),
        description="A live Stripe secret or restricted key was exposed.",
        attacker_impact="Attackers can access payment operations permitted by the key.",
        consequence="Payment data, refunds, charges, and customer records may be compromised.",
        remediation="Revoke the key in Stripe, rotate webhooks if needed, and investigate dashboard logs.",
        provider="Stripe",
        provider_scope="The prefix identifies a live Stripe secret or restricted key; exact permissions require Stripe Dashboard review.",
    ),
    create_rule(
        rule_id="slack-token",
        finding_type="Slack Token",
        severity="HIGH",
        confidence=0.9,
        pattern=compile_rule(r"\bxox[baprs]-[A-Za-z0-9-]{20,220}\b"),
        description="A Slack token was exposed.",
        attacker_impact="Attackers can call Slack APIs with the leaked workspace identity.",
        consequence="Messages, workspace data, and integrations may be abused.",
        remediation="Revoke the token, rotate app credentials, and review Slack audit logs.",
        provider="Slack",
        provider_scope="The token prefix identifies Slack; workspace, app, and granted scopes require authorized Slack administration review.",
    ),
    create_rule(
        rule_id="sendgrid-key",
        finding_type="SendGrid API Key",
        severity="HIGH",
        confidence=0.88,
        pattern=compile_rule(r"\bSG\.[A-Za-z0-9_-]{16,40}\.[A-Za-z0-9_-]{16,80}\b"),
        description="A SendGrid API key was exposed.",
        attacker_impact="Attackers can send email through the associated account.",
        consequence="Spam, phishing, domain reputation damage, and billing abuse may occur.",
        remediation="Revoke the key, rotate email credentials, and review recent mail activity.",
        provider="Twilio SendGrid",
        provider_scope="The key format identifies SendGrid; permission scopes and activity require provider-side review.",
    ),
    create_rule(
        rule_id="generic-api-key",
        finding_type="API Key",
        severity="MEDIUM",
        confidence=0.75,
        pattern=compile_rule(
            r"(?i)\b(api[_-]?key|apikey|x-api-key|client_secret|secret_key|access_token|auth_token)"
            r"\b\s*[:=]\s*[\"']?([A-Za-z0-9._~+/=-]{20,180})"
        ),
        description="A generic API key was found in source or configuration text.",
        attacker_impact="Attackers can call the associated service as the leaked identity.",
        consequence="Quota abuse, data access, account takeover, or service disruption may occur.",
        remediation="Rotate the API key and move it to a managed secret store.",
        provider="Unidentified provider",
        provider_scope="The assignment looks like an API credential, but the provider cannot be identified from the value format or nearby public context.",
    ),
    create_rule(
        rule_id="password-assignment",
        finding_type="Password",
        severity="HIGH",
        confidence=0.7,
        pattern=compile_rule(
            r"(?i)\b(password|passwd|pwd|db_password)\b\s*[:=]\s*[\"']([^\"'\s]{8,128})[\"']?"
        ),
        description="A hardcoded password-like assignment was detected.",
        attacker_impact="Attackers can authenticate to the protected account or system.",
        consequence="Credential reuse may expand the breach to databases, apps, or admin panels.",
        remediation="Change the password, invalidate active sessions, and store secrets outside code.",
    ),
    create_rule(
        rule_id="database-url",
        finding_type="Database URL",
        severity="CRITICAL",
        confidence=0.88,
        pattern=compile_rule(
            r"(?i)\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?)://[^\s\"']+:[^\s\"']+@[^\s\"']+"
        ),
        description="A database connection string containing credentials was exposed.",
        attacker_impact="Attackers can connect to the database if network access is available.",
        consequence="Sensitive records may be read, modified, deleted, or ransomed.",
        remediation="Rotate database credentials, restrict network access, and review database logs.",
    ),
    create_rule(
        rule_id="basic-auth-url",
        finding_type="Basic Auth URL",
        severity="HIGH",
        confidence=0.82,
        pattern=compile_rule(r"(?i)\bhttps?://[^/\s\"':]+:[^/\s\"']+@[^\s\"']+"),
        description="A URL containing an embedded username and password was exposed.",
        attacker_impact="Attackers can reuse the embedded credentials against the target service.",
        consequence="Protected endpoints, dashboards, or upstream services may be accessed.",
        remediation="Rotate the credentials and remove authentication material from public URLs.",
    ),
    create_rule(
        rule_id="bearer-token",
        finding_type="Bearer Token",
        severity="HIGH",
        confidence=0.8,
        pattern=compile_rule(r"(?i)\bbearer\s+([A-Za-z0-9._\-]{24,2048})"),
        description="A bearer token was exposed.",
        attacker_impact="Attackers can replay the token until it expires or is revoked.",
        consequence="API sessions, user data, and privileged workflows may be compromised.",
        remediation="Revoke the token, shorten token lifetime, and rotate signing keys if needed.",
    ),
    create_rule(
        rule_id="jwt-token",
        finding_type="JWT Token",
        severity="HIGH",
        confidence=0.85,
        pattern=compile_rule(r"\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b"),
        description="A JSON Web Token was found.",
        attacker_impact="Attackers can impersonate the token subject if the token is valid.",
        consequence="Application sessions and API authorizations may be abused.",
        remediation="Revoke the token, rotate affected signing secrets, and review session logs.",
    ),
    create_rule(
        rule_id="private-key-block",
        finding_type="Private Key",
        severity="CRITICAL",
        confidence=0.98,
        pattern=compile_rule(
            r"-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----"
        ),
        description="A private cryptographic key block was exposed.",
        attacker_impact="Attackers can decrypt traffic, sign payloads, or access servers depending on key use.",
        consequence="SSH access, TLS trust, package signing, or encrypted data may be compromised.",
        remediation="Replace the key pair, remove it from history, and rotate all dependent trust.",
    ),
)

