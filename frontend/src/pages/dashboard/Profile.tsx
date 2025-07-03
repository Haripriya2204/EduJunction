import { useEffect, useState } from "react";
import { User, studentService } from "../../services/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";
import {
  UserRound,
  Mail,
  Phone,
  BookOpen,
  Building,
  Calendar,
  Save,
  Edit,
  X,
  Briefcase,
} from "lucide-react";
import ProfilePicture from "../../components/profile/ProfilePicture";
import { adminSupabaseService } from "../../services/adminSupabaseService";

const Profile = () => {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await studentService.getProfile();
        setProfile(data);
        // Initialize form data with profile data
        setFormData({
          name: data.name,
          mobileNumber: data.mobileNumber,
          semester: data.semester,
        });
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      // In a real app, this would call an API to update the profile
      // For now, we'll just update the local state
      if (profile) {
        const updatedProfile = { ...profile, ...formData };
        setProfile(updatedProfile);

        // Save to localStorage for our mock implementation
        localStorage.setItem("currentUser", JSON.stringify(updatedProfile));

        // If we had the endpoint in our API service:
        // await studentService.updateProfile(formData);

        toast("Profile updated successfully!");
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast("Failed to update profile. Please try again.");
    }
  };

  const handleCancel = () => {
    // Reset form data to original profile
    if (profile) {
      setFormData({
        name: profile.name,
        mobileNumber: profile.mobileNumber,
        semester: profile.semester,
      });
    }
    setIsEditing(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (!profile) {
      toast.error("Profile not loaded. Please try again.");
      return;
    }
    setPasswordLoading(true);
    try {
      await adminSupabaseService.updateAdminPassword(profile.id, newPassword);
      toast.success("Password updated successfully.");
      setShowPasswordChange(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error("Failed to update password. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-8 w-40" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <Skeleton className="h-10 w-10 rounded-full mr-4" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">
            {profile?.role === "admin" ? "Admin Profile" : "Student Profile"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {profile?.role === "admin" && (
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">Change Password</h2>
              {!showPasswordChange ? (
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordChange(true)}
                >
                  Change Password
                </Button>
              ) : (
                <form
                  onSubmit={handlePasswordChange}
                  className="space-y-4 max-w-md"
                >
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      className="w-full border rounded px-3 py-2"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      className="w-full border rounded px-3 py-2"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={passwordLoading}>
                      {passwordLoading ? "Updating..." : "Update Password"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPasswordChange(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              {profile && (
                <ProfilePicture name={profile.name} userId={profile.id} />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile?.name}</h2>
              <p className="text-gray-500">{profile?.rollNo}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>

              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-edu-primary/10 flex items-center justify-center mr-3">
                  <Mail className="h-5 w-5 text-edu-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{profile?.email}</p>
                  <p className="text-xs text-gray-400">
                    Email cannot be changed
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-edu-primary/10 flex items-center justify-center mr-3">
                  <Phone className="h-5 w-5 text-edu-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Mobile Number</p>
                  <p className="font-medium">{profile?.mobileNumber}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Academic Information</h3>

              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-edu-primary/10 flex items-center justify-center mr-3">
                  <Building className="h-5 w-5 text-edu-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="font-medium">{profile?.department}</p>
                  <p className="text-xs text-gray-400">
                    Department cannot be changed
                  </p>
                </div>
              </div>

              {profile?.role === "student" ? (
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-edu-primary/10 flex items-center justify-center mr-3">
                    <Calendar className="h-5 w-5 text-edu-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Semester</p>
                    <p className="font-medium">{profile?.semester}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-edu-primary/10 flex items-center justify-center mr-3">
                    <Briefcase className="h-5 w-5 text-edu-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Position</p>
                    <p className="font-medium">{profile?.position}</p>
                    <p className="text-xs text-gray-400">
                      Position cannot be changed
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
