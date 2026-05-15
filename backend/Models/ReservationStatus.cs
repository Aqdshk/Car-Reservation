namespace CarBooking.Api.Models;

public static class ReservationStatus
{
    public const string Pending = "Pending";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";

    public static readonly string[] All = { Pending, Approved, Rejected };
    public static bool IsValid(string s) => Array.IndexOf(All, s) >= 0;
}
