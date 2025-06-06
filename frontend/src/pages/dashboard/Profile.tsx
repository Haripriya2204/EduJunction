import { useEffect, useState } from "react";
import { User, studentService } from "../../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
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
  Briefcase
} from "lucide-react";
import ProfilePicture from "../../components/profile/ProfilePicture";

const Profile = () => {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await studentService.getProfile();
        setProfile(data);
        // Initialize form data with profile data
        setFormData({
          name: data.name,
          mobileNumber: data.mobileNumber,
          semester: data.semester
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSave = async () => {
    try {
      // In a real app, this would call an API to update the profile
      // For now, we'll just update the local state
      if (profile) {
        const updatedProfile = { ...profile, ...formData };
        setProfile(updatedProfile);
        
        // Save to localStorage for our mock implementation
        localStorage.setItem('currentUser', JSON.stringify(updatedProfile));
        
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
        semester: profile.semester
      });
    }
    setIsEditing(false);
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
            {profile?.role === 'admin' ? 'Admin Profile' : 'Student Profile'}
          </CardTitle>
          {!isEditing ? (
            <Button 
              onClick={() => setIsEditing(true)} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                onClick={handleSave} 
                size="sm"
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button 
                onClick={handleCancel} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              {profile && <ProfilePicture name={profile.name} userId={profile.id} />}
            </div>
            <div>
              {isEditing ? (
                <Input 
                  name="name"
                  value={formData.name || ""}
                  onChange={handleInputChange}
                  className="font-bold text-xl mb-1"
                />
              ) : (
                <h2 className="text-xl font-bold">{profile?.name}</h2>
              )}
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
                  <p className="text-xs text-gray-400">Email cannot be changed</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-edu-primary/10 flex items-center justify-center mr-3">
                  <Phone className="h-5 w-5 text-edu-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Mobile Number</p>
                  {isEditing ? (
                    <Input 
                      name="mobileNumber"
                      value={formData.mobileNumber || ""}
                      onChange={handleInputChange}
                      className="font-medium"
                    />
                  ) : (
                    <p className="font-medium">{profile?.mobileNumber}</p>
                  )}
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
                  <p className="text-xs text-gray-400">Department cannot be changed</p>
                </div>
              </div>
              
              {profile?.role === 'student' ? (
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-edu-primary/10 flex items-center justify-center mr-3">
                    <Calendar className="h-5 w-5 text-edu-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Semester</p>
                    {isEditing ? (
                      <Input 
                        name="semester"
                        value={formData.semester || ""}
                        onChange={handleInputChange}
                        className="font-medium"
                      />
                    ) : (
                      <p className="font-medium">{profile?.semester}</p>
                    )}
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
                    <p className="text-xs text-gray-400">Position cannot be changed</p>
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
