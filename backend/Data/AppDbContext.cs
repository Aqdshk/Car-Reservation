using CarBooking.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CarBooking.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}

    public DbSet<User> Users => Set<User>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Reservation> Reservations => Set<Reservation>();
    public DbSet<Settings> Settings => Set<Settings>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>().HasIndex(u => u.Email).IsUnique();
        b.Entity<Vehicle>().HasIndex(v => v.PlateNumber).IsUnique();
        b.Entity<Reservation>().HasOne(r => r.Vehicle).WithMany().HasForeignKey(r => r.VehicleId);
        b.Entity<Reservation>().HasIndex(r => r.TrackingCode).IsUnique();
        b.Entity<Reservation>().HasIndex(r => new { r.VehicleId, r.Status, r.StartTime, r.EndTime });
        b.Entity<Reservation>().HasIndex(r => r.Status);
    }
}
