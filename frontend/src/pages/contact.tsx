import React from "react";

const Contact = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto py-12 px-4">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
          <h1 className="text-4xl font-bold mb-6 text-blue-500">Contact</h1>
          <p className="mb-6">For any help or issues faced, please contact:</p>
          <ul className="list-disc pl-5 mb-6">
            <li>
              Abhilash:{" "}
              <a href="mailto:22r21a66d8@mlrit.ac.in" className="text-blue-500">
                22r21a66d8@mlrit.ac.in
              </a>
            </li>
            <li>
              Haripriya:{" "}
              <a href="mailto:22r21a66e4@mlrit.ac.in" className="text-blue-500">
                22r21a66e4@mlrit.ac.in
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Contact;
