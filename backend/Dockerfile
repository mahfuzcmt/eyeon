# --- Build stage -----------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package

# --- Runtime stage ---------------------------------------------------------
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN groupadd --system motolink && useradd --system --gid motolink motolink
COPY --from=build /workspace/target/motolink.jar app.jar
USER motolink
EXPOSE 8080 5023
ENV JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
