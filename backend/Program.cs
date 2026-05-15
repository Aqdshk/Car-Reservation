using System.Text;
using System.Threading.RateLimiting;
using CarBooking.Api.Data;
using CarBooking.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Environment variables override appsettings (CARBOOKING_JWT_KEY, CARBOOKING_DB_CONN)
builder.Configuration.AddEnvironmentVariables(prefix: "CARBOOKING_");

var cfg = builder.Configuration;

var connStr = cfg["DB_CONN"] ?? cfg.GetConnectionString("Default")
    ?? throw new InvalidOperationException("DB connection string missing. Set CARBOOKING_DB_CONN env var or ConnectionStrings:Default.");

var jwtKey = cfg["JWT_KEY"] ?? cfg["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT key missing. Set CARBOOKING_JWT_KEY env var or Jwt:Key.");

if (builder.Environment.IsProduction() && jwtKey.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
    throw new InvalidOperationException("Refusing to start: JWT key is still the placeholder. Set CARBOOKING_JWT_KEY.");

if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("JWT key must be at least 32 bytes (256 bits).");

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseMySql(connStr, ServerVersion.AutoDetect(connStr)));

builder.Services.AddSingleton<JwtService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = cfg["Jwt:Issuer"],
            ValidAudience = cfg["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 5 login attempts per minute per IP
builder.Services.AddRateLimiter(opt =>
{
    opt.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    opt.AddPolicy("login", ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database");

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:5173", "https://reservation.c-zero.my")
     .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

// Ensure uploads directory exists at startup so the controller never races on first request.
var uploadsDir = cfg["UPLOADS_DIR"] ?? Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsDir);

// Auto-seed on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        db.Database.EnsureCreated();
        if (!db.Users.Any())
        {
            var seedPassword = cfg["SEED_ADMIN_PASSWORD"]
                ?? (app.Environment.IsProduction()
                    ? throw new InvalidOperationException("No admin user exists and CARBOOKING_SEED_ADMIN_PASSWORD is not set.")
                    : "admin123");

            db.Users.Add(new CarBooking.Api.Models.User
            {
                Name = "Admin",
                Email = "admin@c-zero.my",
                Role = "Admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(seedPassword)
            });
        }
        if (!db.Vehicles.Any())
        {
            db.Vehicles.AddRange(
                new CarBooking.Api.Models.Vehicle { PlateNumber = "VKL 1234", Make = "Perodua", Model = "Bezza", Type = "Sedan", Fuel = "Petrol", Seats = 5 },
                new CarBooking.Api.Models.Vehicle { PlateNumber = "WXY 5678", Make = "Toyota", Model = "Hilux", Type = "Pickup", Fuel = "Diesel", Seats = 5 },
                new CarBooking.Api.Models.Vehicle { PlateNumber = "VAB 9012", Make = "Honda", Model = "City", Type = "Sedan", Fuel = "Petrol", Seats = 5 }
            );
        }
        db.SaveChanges();
    }
    catch (Exception ex) { Console.WriteLine($"Seed skipped: {ex.Message}"); }
}

app.Run();
