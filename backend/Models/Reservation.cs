using System.ComponentModel.DataAnnotations;

namespace CarBooking.Api.Models;

public class Reservation
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public int VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }
    [Required] public DateTime StartTime { get; set; }
    [Required] public DateTime EndTime { get; set; }
    [Required, MaxLength(255)] public string Destination { get; set; } = "";
    public int Passengers { get; set; } = 1;
    public int DistanceKm { get; set; }
    [MaxLength(1000)] public string? Notes { get; set; }
    [MaxLength(20)] public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
