# Car Reservation API. Built in GitHub Actions, never on the server:
# the server is shared with the PlagSini CSMS and a .NET SDK build needs ~1 GB.
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY CarBooking.Api.csproj ./
RUN dotnet restore
COPY . ./
RUN dotnet publish -c Release -o /out --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runner
WORKDIR /app
# curl for the container health check.
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /out ./
ENV ASPNETCORE_URLS=http://0.0.0.0:5000 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_PRINT_TELEMETRY_MESSAGE=false \
    # Workstation GC keeps the heap small; server GC sizes itself to the host.
    DOTNET_gcServer=0 \
    CARBOOKING_UPLOADS_DIR=/data/uploads
ARG GIT_SHA=unknown
ENV GIT_SHA=${GIT_SHA}
RUN mkdir -p /data/uploads && chown -R app:app /data
USER app
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS http://127.0.0.1:5000/health || exit 1
ENTRYPOINT ["dotnet", "CarBooking.Api.dll"]
