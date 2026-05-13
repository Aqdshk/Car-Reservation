using CarBooking.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CarBooking.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}

    public DbSet<User> Users => Set<User>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Reservation> Reservations => Set<Reservation>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>().HasIndex(u => u.Email).IsUnique();
        b.Entity<Vehicle>().HasIndex(v => v.PlateNumber).IsUnique();
        b.Entity<Reservation>().HasOne(r => r.Vehicle).WithMany().HasForeignKey(r => r.VehicleId);
    }
}
