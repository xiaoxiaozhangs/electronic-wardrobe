FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY target/smart-wardrobe-1.0.0-SNAPSHOT.jar app.jar

EXPOSE 8080

ENV SPRING_PROFILES_ACTIVE=prod
ENV JAVA_OPTS="-Xmx1g -XX:+UseG1GC"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
