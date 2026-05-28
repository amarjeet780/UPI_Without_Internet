# Stage 1: Build the React Frontend
FROM node:20 AS frontend-build
WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy the rest of the frontend source and build
COPY frontend/ ./
RUN npm run build


# Stage 2: Build the Spring Boot Backend
FROM maven:3.9.6-eclipse-temurin-17 AS backend-build
WORKDIR /app

# Copy the Maven wrapper and pom.xml
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Download dependencies (this caches dependencies if pom.xml hasn't changed)
RUN ./mvnw dependency:go-offline -B

# Copy the backend source code
COPY src ./src

# Copy the built frontend into the Spring Boot static resources folder
# This allows Spring Boot to serve the React app
COPY --from=frontend-build /app/src/main/resources/static ./src/main/resources/static/

# Build the Spring Boot application
RUN ./mvnw clean package -DskipTests


# Stage 3: Run the Application
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Expose the port your Spring Boot app runs on (Render uses 10000 by default, or relies on the PORT env var)
EXPOSE 8080

# Copy the built jar file from the backend-build stage
COPY --from=backend-build /app/target/*.jar app.jar

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
