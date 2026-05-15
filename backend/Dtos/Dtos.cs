using System.ComponentModel.DataAnnotations;

namespace CarBooking.Api.Dtos;

public record LoginDto(
    [Required, EmailAddress, MaxLength(150)] string Email,
    [Required, MaxLength(200)] string Password);

public record AuthResponse(string Token, int UserId, string Name, string Email, string Role);

public record VehicleDto(int Id, string PlateNumber, string Make, string Model, string Type, string Fuel, int Seats, string Status);

public record CreateVehicleDto(
    [Required, MaxLength(50)] string PlateNumber,
    [Required, MaxLength(100)] string Make,
    [Required, MaxLength(100)] string Model,
    [Required, MaxLength(50)] string Type,
    [Required, MaxLength(30)] string Fuel,
    [Range(1, 100)] int Seats);

public record ReservationDto(
    int Id, string TrackingCode,
    string BookerName, string? BookerEmail, string? BookerPhone, string? Department,
    int VehicleId, string VehiclePlate, string VehicleName,
    DateTime StartTime, DateTime EndTime, string Destination, int Passengers, int DistanceKm,
    bool NeedTngCard, bool NeedFuelCard,
    string? Notes, string Status, DateTime CreatedAt,
    int? StartMileage, int? EndMileage,
    string? StartMileagePhoto, string? EndMileagePhoto,
    DateTime? CheckedInAt, DateTime? CheckedOutAt);

public record CreateReservationDto(
    [Required, MaxLength(100)] string BookerName,
    [EmailAddress, MaxLength(150)] string? BookerEmail,
    [MaxLength(50)] string? BookerPhone,
    [MaxLength(100)] string? Department,
    [Range(1, int.MaxValue)] int VehicleId,
    [Required] DateTime StartTime,
    [Required] DateTime EndTime,
    [Required, MaxLength(255)] string Destination,
    [Range(1, 100)] int Passengers,
    [Range(0, 10000)] int DistanceKm,
    bool NeedTngCard,
    bool NeedFuelCard,
    [MaxLength(1000)] string? Notes);

public record UpdateStatusDto([Required, MaxLength(20)] string Status);
public record BusySlotDto(int Id, int VehicleId, DateTime StartTime, DateTime EndTime, string Status, string BookerName);

public record CardStatusDto(int TotalTng, int InUseTng, int AvailableTng, int TotalFuel, int InUseFuel, int AvailableFuel);
public record UpdateCardSettingsDto(
    [Range(0, 100)] int TotalTngCards,
    [Range(0, 100)] int TotalFuelCards);
