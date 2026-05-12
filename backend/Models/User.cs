using System.ComponentModel.DataAnnotations;

namespace CarBooking.Api.Models;

public class User
{
    public int Id { get; set; }
    [Required, MaxLength(100)] public string Name { get; set; } = "";
    [Required, MaxLength(150)] public string Email { get; set; } = "";
    [Required] public string PasswordHash { get; set; } = "";
    [Required, MaxLength(20)] public string Role { get; set; } = "Staff";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
