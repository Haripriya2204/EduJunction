import { useState, useRef } from "react";
import { Button } from "../ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { Edit, Upload, UserRound, X } from "lucide-react";
import { toast } from "sonner";

interface ProfilePictureProps {
  name: string;
  userId: string;
}

const ProfilePicture = ({ name, userId }: ProfilePictureProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(
    localStorage.getItem(`profilePicture-${userId}`) || null
  );
  const [isEditing, setIsEditing] = useState(false);
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast("Image size should be less than 5MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImage(result);
        localStorage.setItem(`profilePicture-${userId}`, result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const removeImage = () => {
    setImage(null);
    localStorage.removeItem(`profilePicture-${userId}`);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="relative">
        <Avatar className="h-28 w-28 border-2 border-gray-200">
          {image ? (
            <AvatarImage src={image} alt={name} />
          ) : (
            <AvatarFallback className="bg-edu-primary text-white text-2xl">
              {getInitials(name)}
            </AvatarFallback>
          )}
        </Avatar>
        
        {isEditing ? (
          <div className="absolute -bottom-3 -right-3 flex space-x-1">
            <Button 
              size="icon" 
              variant="default" 
              className="h-7 w-7 rounded-full"
              onClick={triggerFileInput}
            >
              <Upload className="h-4 w-4" />
            </Button>
            {image && (
              <Button 
                size="icon" 
                variant="destructive" 
                className="h-7 w-7 rounded-full"
                onClick={removeImage}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <Button 
            size="icon" 
            variant="outline" 
            className="absolute -bottom-3 -right-3 h-8 w-8 rounded-full bg-white"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {isEditing && (
        <Button 
          variant="ghost" 
          className="text-xs h-7"
          onClick={() => setIsEditing(false)}
        >
          Done Editing
        </Button>
      )}
      
      <input 
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleImageChange}
      />
    </div>
  );
};

export default ProfilePicture;
