namespace CarBooking.Api.Dtos;

public record LoginDto(string Email, string Password);
public record AuthResponse(string Token, int UserId, string Name, string Email, string Role);

public record VehicleDto(int Id, string PlateNumber, string Make, string Model, string Type, string Fuel, int Seats, string Status);
public record CreateVehicleDto(string PlateNumber, string Make, string Model, string Type, string Fuel, int Seats);

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
    string BookerName, string? BookerEmail, string? BookerPhone, string? Department,
    int VehicleId, DateTime StartTime, DateTime EndTime,
    string Destination, int Passengers, int DistanceKm,
    bool NeedTngCard, bool NeedFuelCard, string? Notes);

public record UpdateStatusDto(string Status);
public record BusySlotDto(int Id, int VehicleId, DateTime StartTime, DateTime EndTime, string Status, string BookerName);
