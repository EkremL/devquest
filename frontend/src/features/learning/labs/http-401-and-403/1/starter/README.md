# Lab 01 — Diagnose and Repair HTTP Basic Authentication and Authorization

Open Session 2.6 → **Coding Lab** in DevQuest for the complete exercise and progressive hints.

Extract the ZIP into a new working directory. In IntelliJ select **File → Open** and open the extracted `pom.xml` as a project. Select JDK 25 under **File → Project Structure**. Under **Settings → Build Tools → Maven**, use Maven 3.9.16 and set the Maven runner to the project JDK. Run these commands from the extracted directory:

```powershell
mvn -version
mvn -DskipTests package
mvn -Dtest=SummarySecurityTest test
```

The starter builds. Two of the five tests initially fail on a challenge header; the rest should pass. Trace both failures in `SecurityConfig.java`, preserve the existing status and error-body contract, then run `mvn test` and check all five tests pass.

Optionally launch with `mvn spring-boot:run` and inspect the local response with `curl.exe -i http://127.0.0.1:18086/api/tasks/summary`. Stop the service with Ctrl+C.

| Local fixture account | Demo-only password | Authority |
| --- | --- | --- |
| `demo-reader` | `demo-reader-pass` | `TASK_READ` |
| `demo-creator` | `demo-creator-pass` | `TASK_CREATE` |

The service uses an in-memory fixture and listens on loopback. Use these demonstration accounts only in this lab. No database or DevQuest credentials are needed.
