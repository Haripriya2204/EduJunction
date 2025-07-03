import React from "react";

const Help = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pink-300 via-blue-600 to-blue-800 py-12 px-4">
      <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-blue-100 drop-shadow-lg">
        Student Registration Process
      </h1>
      <div className="w-full max-w-3xl flex justify-center">
        <div className="aspect-w-16 aspect-h-9 w-full">
          <iframe
            width="892"
            height="524"
            src="https://www.youtube.com/embed/c1DHPAlmt5g"
            title="EDMIT Student Registration video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="rounded-lg shadow-lg w-full h-[350px] md:h-[524px]"
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default Help;
