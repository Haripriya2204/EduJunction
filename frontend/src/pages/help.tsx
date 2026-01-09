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
      {/* FAQ Section */}
      <div className="w-full max-w-3xl mt-12 bg-white/80 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-blue-900 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg text-blue-800">
              What is our username and password?
            </h3>
            <p className="text-gray-800">Initially it is your roll number</p>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-blue-800">
              When do we need to select courses?
            </h3>
            <p className="text-gray-800">
              You have to wait until your hod approves your fee receipt
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-blue-800">
              What is our utr number?
            </h3>
            <p className="text-gray-800">
              The utr number or transaction id that would be mentioned in your
              fee receipts and transaction details of your bank or in your upi
              transactions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
