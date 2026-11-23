# Lesson XX — Lesson Title

## Status

- [ ] Not started
- [ ] 🚧 In progress
- [ ] 🔁 Needs review
- [ ] Completed

## Prerequisites

List the concepts and implementation steps that must already be understood.

## 1. Lesson Goal

State what I should be able to explain, implement, test, and debug after this lesson.

## 2. Underlying Security Problem

Explain the problem without mentioning Spring Security classes.

Questions to answer:

- What asset are we protecting?
- Who is making the request?
- Which credential or proof is presented?
- Which trust boundary is crossed?
- What can an attacker attempt?

## 3. Framework-Independent Solution

Explain the general solution, alternatives, and trade-offs.

## 4. HTTP Details

Include a concrete request and response.

```http
GET /example HTTP/1.1
Host: localhost:8080
```

Describe relevant headers, cookies, status codes, and request state.

## 5. Request or Architecture Flow

```text
Client
  -> Credential extraction
  -> Credential verification
  -> Authenticated identity
  -> Authorization decision
  -> Business logic
```

Explain where failure can occur.

## 6. Attacks and Failure Scenarios

- Attack or misuse case
- Why it works
- Prevention
- Safe failure behavior
- What should and should not be logged

## 7. Spring Security Mapping

| General concept | Spring Security representation |
|---|---|
| Authenticated identity for the current request | `SecurityContext` |
| Authentication result and authorities | `Authentication` |
| Credential verification mechanism | `AuthenticationProvider` |
| Permission or role representation | `GrantedAuthority` |
| Pre-controller credential processing | Security filter |
| Method authorization policy | `@PreAuthorize` |

Only add components used by the current lesson.

## 8. Cross-Ecosystem Comparison

Briefly show how the same idea appears in one of:

- ASP.NET Core
- Node.js
- Django
- Keycloak or another identity provider

Do not turn this into a second full tutorial.

## 9. Implementation Plan

List only the small changes required for this lesson.

## 10. Incremental Code

Add code in small sections. Explain each important class, annotation, method, and configuration.

## 11. Important Design Decisions

Record decisions and their reasons.

Example:

```text
Decision:
Reason:
Alternative:
Trade-off:
```

## 12. Common Mistakes and Security Risks

Separate them into:

### Mandatory Corrections

Issues that cause incorrect behavior, vulnerabilities, data exposure, or broken architecture.

### Optional Improvements

Readability, maintainability, or style improvements that are useful but not required.

## 13. My Explanation

Explain the concept in my own words without copying the lesson.

```text
My explanation:
```

## 14. Assignment

A small task that I must attempt before seeing the solution.

## 15. Review Questions

1. Question
2. Question
3. Question
4. Question
5. Question

At least some questions must avoid Spring-specific class names.

## 16. Test Evidence

```text
Tests executed:
Expected result:
Actual result:
```

## 17. Progress Checklist

- [ ] I can explain the security problem.
- [ ] I can explain the HTTP flow.
- [ ] I can identify at least one attack.
- [ ] I understand the Spring Security mapping.
- [ ] I completed the assignment.
- [ ] Relevant tests pass.
- [ ] I can explain the topic without reading the note.

## 18. Technology-Independent Takeaways

Summarize what remains true in any language or framework.

## 19. What Comes Next

State the next lesson and why it logically follows.
