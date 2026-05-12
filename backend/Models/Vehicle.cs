using System.ComponentModel.DataAnnotations;

namespace CarBooking.Api.Models;

public class Vehicle
{
    public int Id { get; set; }
    [Required, MaxLength(50)] public string PlateNumber { get; set; } = "";
    [Required, MaxLength(100)] public string Make { get; set; } = "";
    [Required, MaxLength(100)] public string Model { get; set; } = "";
    [MaxLength(50)] public string Type { get; set; } = "Sedan";
    [MaxLength(30)] public string Fuel { get; set; } = "Petrol";
    public int Seats { get; set; } = 5;
    [MaxLength(20)] public string Status { get; set; } = "Available";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
