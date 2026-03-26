import java.util.Properties

// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    id("org.sonarqube") version "5.1.0.4882"
}

// Cargar token desde local.properties o variable de entorno
val rootLocalProperties = Properties()
val rootLocalPropertiesFile = rootProject.file("local.properties")
if (rootLocalPropertiesFile.exists()) {
    rootLocalPropertiesFile.inputStream().use { rootLocalProperties.load(it) }
}
val sonarToken: String? = rootLocalProperties.getProperty("sonar.token") ?: System.getenv("SONAR_TOKEN")

sonarqube {
    properties {
        property("sonar.host.url", "https://sonarcloud.io")
        property("sonar.organization", "inbyte-cl")
        property("sonar.projectKey", "inbyte-cl_parkingon")
        property("sonar.projectName", "ParkingOnStreet")
        property("sonar.projectVersion", "1.0")
        property("sonar.kotlin.file.suffixes", ".kt")
        property("sonar.gradle.skipCompile", "true")
        property("sonar.scm.disabled", "true")
        property("sonar.exclusions", "**/build/**,**/tmp/**,**/*.class,**/R.java,**/BuildConfig.java,**/BuildConfig.kt")
        property("sonar.cpd.exclusions", "**/R.java,**/BuildConfig.java,**/BuildConfig.kt")
        // lint: deshabilitado por bug de WindowsPathParser en GradleDetector en Windows
        // property("sonar.android.lint.reportPaths", "app/build/reports/lint-results-debug.xml")
        property("sonar.issue.ignore.multicriteria", "e1,e2,e3")
        property("sonar.issue.ignore.multicriteria.e1.ruleKey", "kotlin:S4792")
        property("sonar.issue.ignore.multicriteria.e1.resourceKey", "**/*.kt")
        property("sonar.issue.ignore.multicriteria.e2.ruleKey", "kotlin:S2629")
        property("sonar.issue.ignore.multicriteria.e2.resourceKey", "**/*.kt")
        property("sonar.issue.ignore.multicriteria.e3.ruleKey", "kotlin:S6310")
        property("sonar.issue.ignore.multicriteria.e3.resourceKey", "**/*.kt")
        if (sonarToken != null) {
            property("sonar.token", sonarToken)
        } else {
            logger.warn("⚠️ SONAR_TOKEN no configurado. Agrega sonar.token en local.properties o la variable de entorno SONAR_TOKEN")
        }
    }
}