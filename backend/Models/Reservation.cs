using System.ComponentModel.DataAnnotations;

namespace CarBooking.Api.Models;

public class Reservation
{
    public int Id { get; set; }

    [Required, MaxLength(100)] public string BookerName { get; set; } = "";
    [MaxLength(150)] public string? BookerEmail { get; set; }
    [MaxLength(50)] public string? BookerPhone { get; set; }
    [MaxLength(100)] public string? Department { get; set; }

    public int VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }

    [Required] public DateTime StartTime { get; set; }
    [Required] public DateTime EndTime { get; set; }
    [Required, MaxLength(255)] public string Destination { get; set; } = "";
    public int Passengers { get; set; } = 1;
    public int DistanceKm { get; set; }
    public bool NeedTngCard { get; set; }
    public bool NeedFuelCard { get; set; }
    [MaxLength(1000)] public string? Notes { get; set; }
    [MaxLength(20)] public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
