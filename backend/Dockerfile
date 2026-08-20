FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ScoreHistory.Api.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish ScoreHistory.Api.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app ./

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_HTTP_PORTS=
EXPOSE 8080

ENTRYPOINT ["/bin/sh", "-c", "exec dotnet ScoreHistory.Api.dll --urls http://0.0.0.0:${PORT:-8080}"]
