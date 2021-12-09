import { Link } from 'react-router-dom';
import React from 'react';
import './ExploreContainer.css';
import { TestContext, withContext, Preferences, Credentials, LocalData } from './TestProvider';
import { useLocation } from 'react-router-dom'; //TESTING

interface ContainerProps {
  name: string;
}
/*
//const PrefUser = (text: string, prefs: Preferences) => {
interface Prefs {
  text: string,
  prefs: Preferences
}
const PrefUser: React.FC<Prefs> = ({text, prefs}) => {
  console.log("RENDERED PREFUSER WEEWOOWEEWOO");
  return (
    <div>
    <span>test: {text}, autodownload: {prefs.autoDownload ? "ye" : "ne"}</span>
    </div>
  )
}
interface Creds {
  text: string,
  creds: Credentials
}
const CredUser: React.FC<Creds> = ({text, creds}) => {
  const location = useLocation();
  console.log("RENDERED CREDUSER WEEWOOWEEWOO");
  return (
    <div>
    <span>test: {text}, credentials: {JSON.stringify(creds)}</span>
    </div>
  )
}
const WrappedPrefUser = withContext( ((state: LocalData)=> {return {prefs: state.preferences}}) )(PrefUser);
const WrappedCredUser = withContext( ((state: LocalData)=> {return {creds: state.credentials}}) )(CredUser);
*/
const ExploreContainer: React.FC<ContainerProps> = ({ name }) => {

  return (
    <div className="container">
      <strong>{name}</strong>
      <p>Explore <a target="_blank" rel="noopener noreferrer" href="https://ionicframework.com/docs/components">UI Components</a> and my nipples</p>
      <p><Link to="/game/sc6">SC6</Link></p>
      <p><Link to="/game/sc6/character/talim">taleem</Link></p>
      {/*<WrappedPrefUser text="prefs here" />*/}
      {/*<WrappedCredUser text="creds here" />*/}
    </div>
  );
};

export default ExploreContainer;
