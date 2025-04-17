import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Character Info Panel displays AI-analyzed character profiles and sentiment data
 */
const CharacterInfoPanel = ({ 
  characterProfiles, 
  sentimentData, 
  characterMap, 
  className,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('profiles');
  const [expandedCharacter, setExpandedCharacter] = useState(null);
  
  // If we don't have profiles, don't render
  if (!characterProfiles || Object.keys(characterProfiles).length === 0) {
    return null;
  }
  
  // Get profiles data in a usable format
  const profiles = characterProfiles.data || {};
  const profilesArray = Object.entries(profiles).map(([name, profile]) => ({
    name,
    ...profile
  }));
  
  // Get sentiment data in a usable format
  const sentiments = sentimentData?.data || {};
  
  // Get mapping data
  const mappings = characterMap?.mappings || {};
  
  // Get emotion color for sentiment display
  const getEmotionColor = (emotion) => {
    const emotionColors = {
      angry: 'bg-red-500',
      sad: 'bg-blue-400',
      happy: 'bg-yellow-400',
      excited: 'bg-orange-400',
      neutral: 'bg-gray-400',
      calm: 'bg-teal-400',
      fearful: 'bg-purple-400',
      surprised: 'bg-pink-400',
      thoughtful: 'bg-indigo-400'
    };
    
    return emotionColors[emotion?.toLowerCase()] || 'bg-gray-400';
  };
  
  // Toggle character expansion
  const toggleExpand = (characterName) => {
    if (expandedCharacter === characterName) {
      setExpandedCharacter(null);
    } else {
      setExpandedCharacter(characterName);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 ${className || ''}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Character Analysis</h3>
        <button 
          onClick={onClose} 
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        <button
          className={`py-2 px-4 text-sm font-medium ${
            activeTab === 'profiles' 
              ? 'text-primary-600 border-b-2 border-primary-600 dark:text-primary-400 dark:border-primary-400' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('profiles')}
        >
          Character Profiles
        </button>
        <button
          className={`py-2 px-4 text-sm font-medium ${
            activeTab === 'emotions' 
              ? 'text-primary-600 border-b-2 border-primary-600 dark:text-primary-400 dark:border-primary-400' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('emotions')}
        >
          Current Emotions
        </button>
        <button
          className={`py-2 px-4 text-sm font-medium ${
            activeTab === 'mapping' 
              ? 'text-primary-600 border-b-2 border-primary-600 dark:text-primary-400 dark:border-primary-400' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('mapping')}
        >
          Character Mapping
        </button>
      </div>
      
      {/* Content Area */}
      <div className="overflow-y-auto max-h-[400px] pr-2">
        {/* Character Profiles Tab */}
        {activeTab === 'profiles' && (
          <div className="space-y-4">
            {profilesArray.length > 0 ? (
              profilesArray.map(profile => (
                <div 
                  key={profile.name}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 cursor-pointer transition-all"
                  onClick={() => toggleExpand(profile.name)}
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-gray-800 dark:text-white">{profile.name}</h4>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-5 w-5 text-gray-500 transition-transform ${expandedCharacter === profile.name ? 'transform rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  
                  {profile.role && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{profile.role}</p>
                  )}
                  
                  {expandedCharacter === profile.name && (
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300 space-y-2">
                      {profile.description && (
                        <p>{profile.description}</p>
                      )}
                      
                      {profile.traits && profile.traits.length > 0 && (
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-200 mt-2">Key Traits:</p>
                          <ul className="list-disc list-inside ml-2 mt-1">
                            {profile.traits.map((trait, index) => (
                              <li key={index}>{trait}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {profile.relationships && Object.keys(profile.relationships).length > 0 && (
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-200 mt-2">Relationships:</p>
                          <ul className="list-disc list-inside ml-2 mt-1">
                            {Object.entries(profile.relationships).map(([person, relationship], index) => (
                              <li key={index}><span className="font-medium">{person}</span>: {relationship}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No character profiles detected yet
              </p>
            )}
          </div>
        )}
        
        {/* Current Emotions Tab */}
        {activeTab === 'emotions' && (
          <div className="space-y-4">
            {Object.keys(sentiments).length > 0 ? (
              Object.entries(sentiments).map(([name, emotion]) => (
                <div key={name} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-gray-800 dark:text-white">{name}</h4>
                    {emotion.primary && (
                      <span className={`px-2 py-1 rounded-full text-xs text-white ${getEmotionColor(emotion.primary)}`}>
                        {emotion.primary}
                      </span>
                    )}
                  </div>
                  
                  {emotion.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      {emotion.description}
                    </p>
                  )}
                  
                  {emotion.intensity && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Calm</span>
                        <span>Intense</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-500 dark:bg-primary-400"
                          style={{ width: `${(emotion.intensity / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No emotion data detected yet
              </p>
            )}
          </div>
        )}
        
        {/* Character Mapping Tab */}
        {activeTab === 'mapping' && (
          <div className="space-y-4">
            {Object.keys(mappings).length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Original Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Standardized Name
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-800">
                  {Object.entries(mappings).map(([original, standardized], index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : ''}>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                        {original}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                        {standardized}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No character mapping data available
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

CharacterInfoPanel.propTypes = {
  characterProfiles: PropTypes.object,
  sentimentData: PropTypes.object,
  characterMap: PropTypes.object,
  className: PropTypes.string,
  onClose: PropTypes.func.isRequired
};

export default CharacterInfoPanel;
