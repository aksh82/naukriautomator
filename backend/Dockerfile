FROM eclipse-temurin:17-jre

WORKDIR /app

RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

COPY target/naukri-be.jar app.jar

RUN chown appuser:appgroup app.jar

USER appuser

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
