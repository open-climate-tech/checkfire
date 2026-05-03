import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div style={{ textAlign: 'left' }}>
      <Head>
        <title>Open Climate Tech</title>
      </Head>

      {/* Navbar */}
      <div className="w3-top">
        <div className="w3-bar w3-white w3-wide w3-padding w3-card">
          <a
            className="w3-bar-item w3-button w3-hide-medium w3-hide-large w3-right w3-hover-white w3-large w3-light-grey"
            href="#"
            onClick={(e) => { e.preventDefault(); setNavOpen(!navOpen); }}
            title="Toggle Navigation Menu"
            aria-label="Toggle navigation menu"
            aria-expanded={navOpen}
          >
            <i className="fa fa-bars" aria-hidden="true"></i>
          </a>
          <div className="w3-col s3">
            <a href="#home" className="w3-button w3-block">Home</a>
          </div>
          <div className="w3-col s3 w3-hide-small">
            <a href="#projects" className="w3-button w3-block">Projects</a>
          </div>
          <div className="w3-col s3 w3-hide-small">
            <a href="#about" className="w3-button w3-block">About</a>
          </div>
          <div className="w3-col s3 w3-hide-small">
            <a href="#contact" className="w3-button w3-block">Contact</a>
          </div>
        </div>

        {/* Navbar on small screens */}
        <div className={`w3-bar-block w3-white w3-hide-large w3-hide-medium w3-large${navOpen ? ' w3-show' : ''}`}>
          <a href="#projects" className="w3-bar-item w3-button w3-padding-large">Projects</a>
          <a href="#about" className="w3-bar-item w3-button w3-padding-large">About</a>
          <a href="#contact" className="w3-bar-item w3-button w3-padding-large">Contact</a>
        </div>
      </div>

      {/* Header */}
      <header
        className="w3-display-container w3-content w3-wide w3-margin-top w3-center"
        style={{ maxWidth: '1600px' }}
        id="home"
      >
        <img
          className="w3-image oct-head-margin"
          src="https://storage.googleapis.com/oct-fire-public/website/oct-bk14x5.jpg"
          alt="Nature"
        />
        <div className="w3-display-middle w3-margin-top">
          <h1 className="w3-xxlarge w3-text-white">Open Climate Tech</h1>
        </div>
      </header>

      <div className="w3-row-padding w3-padding-64 w3-container w3-light-grey">
        <div className="w3-content">
          <p>
            Open Climate Tech is a 501c3 non-profit organization focused on building open source
            technologies that have the potential to help mitigate the adverse impacts of climate
            change.
          </p>
        </div>
      </div>

      <h1 className="w3-padding-32 w3-row-padding" id="projects">Projects</h1>

      {/* Projects Grid */}
      <div className="w3-row-padding w3-padding-64 w3-container w3-light-grey">
        <div className="w3-content">
          <h2>Wildfire Detection and Checking</h2>
          <p>
            Wildfires are getting more destructive over time due to many factors including climate
            change. Besides the devastating impact on lives and property, wildfires also release
            significant amount of carbon back into the atmosphere, thus speeding up climate change
            even further. The goal of this project is to automatically detect wildfires in their
            initial phase, so the authorities responsible for wildfires can take appropriate action
            while the fire is still small and easy to manage. This project does not have any opinion
            on determining the optimal action for each fire.
          </p>
          <p>
            This project uses machine learning based tools to identify potential smoke from wildfires
            using real-time images from cameras installed at vantage points, such as mountain tops
            and cell towers. The information about the automatically detected potential wildfires is
            displayed on the website in real-time for people to check and confirm whether they are
            real fires. For real fires, people may wish to inform local fire department. This system
            has successfully detected some fires before authorities were aware of them, but the
            system also generates some false notifications. Therefore, it is useful to have people
            review the notifications. Doing the same task without such a system would require a large
            number of people continuously staring at real-time images coming from the same cameras
            and maintain high vigilance throughout. That is the main impediment why these cameras are
            currently not used for detection, but only for verifying reported fires and for
            monitoring known fires.
          </p>
          <p>
            This system continuously monitors a few hundred cameras, some of which rotate full 360
            degrees every minute or two. The spinning cameras usually take a still image when looking
            at same handful of directions every rotation, effectively resulting in a handful of
            cameras (one per direction) for detection purposes. The system has access to the cameras
            installed across California, but currently actively monitors only a subset of them
            (mostly in Southern California) because existing users monitor those regions. If you are
            interested in monitoring a different region in California, please contact us at the
            address below.
          </p>
          <p>
            Folks from multiple organizations have contributed to this project during its lifetime
            - listing some of them here:{' '}
            <a href="https://ffla-sandiego.org/">FFLA San Diego</a>,{' '}
            <a href="https://hpwren.ucsd.edu/">HPWREN</a>,{' '}
            <a href="https://www.alertcalifornia.org/">ALERTCalifornia | UC San Diego</a>, and{' '}
            <a href="https://www.lbl.gov/">Lawrence Berkeley National Lab</a>.
          </p>

          <h3 className="w3-padding-16">Wildfire Detection</h3>
          <p>
            The detection technique used by this project relies on three machine learning based
            filters and multiple traditional non-machine-learning based algorithms. The three machine
            learning filters check for whether an image contains something that looks like smoke,
            moves like smoke, and whether the current weather conditions are likely to support
            wildifires. Each of these three are briefly described below. Real-time images are
            collected from the cameras and checked by the filters. Images that fail any particular
            filter are discarded immediately, while images that are deemed by the filter to be likely
            fire are then checked by the next filter. Only images deemed to likely contain fire by
            all the filters are declared as a potential wildfire by the system.
          </p>

          <h5 className="w3-padding-16">Looks like smoke</h5>
          <p>
            We trained a machine learning model for image object recognition (Inception V3) to
            detect if the image contains something that looks like smoke. Training requires many
            thousands of unique images containing real smoke as well as roughly equal number of
            unique images that do not contain smoke. The non-smoke images are carefully selected to
            contain things that visually appear similar to smoke so the machine-learing model learns
            to differentiate between them. We acquired images of smoke from early phases of
            historical wildfires from these same cameras and cropped them around the fire.
          </p>
          <p>
            For detection, images are divided into slightly overlapping squares of 299x299 pixels,
            and the machine learning system computes a value (between 0.0 and 1.0) for each square.
            High values are more likely to be real wildfires. The system is not perfect and regularly
            generates false positives, which are mostly triggered by fog or clouds. We are
            continuously working on improving the accuracy of the system. Below are sample images of
            both true and false positives.
          </p>

          <div className="w3-row-padding">
            <div className="w3-col l6 m6 w3-margin-bottom">
              <div className="w3-display-container">
                <div className="w3-display-topleft w3-black w3-padding">True Positive</div>
                <img
                  src="https://storage.googleapis.com/oct-fire-public/website/true-pos800.jpg"
                  alt="True Positive Smoke"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div className="w3-col l6 m6 w3-margin-bottom">
              <div className="w3-display-container">
                <div className="w3-display-topleft w3-black w3-padding">False Positive</div>
                <img
                  src="https://storage.googleapis.com/oct-fire-public/website/false-pos800.jpg"
                  alt="False Positive Smoke"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          <h5 className="w3-padding-16">Moves like smoke</h5>
          <p>
            This machine learning based filter uses the same image object recognition model
            (Inception V3) mentioned above, but this time the model was trained on specially prepared
            composite images that highlight changes between successive images (usually one minute
            apart) from the same view. Similar to the earlier model, this one was also trained on
            many thousands of unique composite images containing real smoke from early phases of
            wildfires and images without smoke. Below are a few sample composite images of smoke with
            the changes highlighted in red.
          </p>

          <div className="w3-row-padding">
            <div className="w3-col m4">
              <img
                src="https://storage.googleapis.com/oct-fire-public/website/rdiff_true1.jpg"
                alt="Composite changes image 1"
                style={{ width: '100%' }}
              />
            </div>
            <div className="w3-col m4">
              <img
                src="https://storage.googleapis.com/oct-fire-public/website/rdiff_true2.jpg"
                alt="Composite changes image 2"
                style={{ width: '100%' }}
              />
            </div>
            <div className="w3-col m4">
              <img
                src="https://storage.googleapis.com/oct-fire-public/website/rdiff_true3.jpg"
                alt="Composite changes image 3"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <h5 className="w3-padding-16">Fire weather</h5>
          <p>
            This machine learning based filter uses the weather data (e.g., temperature, humidity,
            wind, visibility, etc...) at both the camera location as well as the location of the
            potentail fire. It has been trained with thousands of datapoints of both real fires and
            situations when false positives were not caught by earlier filters.
          </p>

          <h3 className="w3-padding-16">Wildfire Checking</h3>
          <p>
            The real-time potential wildfire notifications from the detection service are displayed
            on{' '}
            <Link href="/wildfirecheck">this live updating site</Link>. The display for each potential
            wildfire event is optimized so users can quickly determine if the event is real fire or a
            false positive. Each event includes a time-lapse video of previous few minutes of the
            same area as well as a map with a highligheted triangle indicating the view from the
            associated video.
          </p>
          <p>
            The site allows users to vote on each notification to indicate whether it was a real fire
            or not. The events where the majority of the users confirm a real fire are displayed on a
            separate <Link href="/confirmed">Confirmed Fires</Link> tab. The votes are also helpful for
            improving the system by retraining the machine learning system with new images. Users can
            also specify a desired geographical region to limit the notifications to those that may
            overlap the specified region.
          </p>
          <p>
            In case someone discovers a real fire that recently ignited, they should consider
            informing the wildfire dispatch center to take appropriate action. Please note that this
            site does not alert the authorities directly.
          </p>
          <Link href="/wildfirecheck" className="w3-large w3-button w3-round-large w3-black">
            Check potential wildfires
          </Link>

          <h3 className="w3-padding-16">Publications</h3>
          <ul>
            <li>
              2020 Jan:{' '}
              <a href="https://doi.org/10.3390/rs12010166">Paper</a> published in the peer
              reviewed{' '}
              <a href="https://www.mdpi.com/journal/remotesensing">Remote Sensing journal</a>{' '}
              containing a detailed description of an earlier version of the system.
            </li>
            <li>
              2021 Apr:{' '}
              <a href="http://hpwren.ucsd.edu/news/20210430/">Article</a> describing some lessons
              learned while operating the system.
            </li>
            <li>
              2021 Dec:{' '}
              <a href="https://youtu.be/pswjrsIot4U?t=9898">Video</a> recording of a 15-minute
              presentation about the project at{' '}
              <a href="https://fsapps.nwcg.gov/nirops/pages/tfrsac">TFRSAC</a> wildfire conference.
            </li>
          </ul>

          <h3 className="w3-padding-16">Source code</h3>
          <p>
            This is an open source project with the code available on GitHub. The backend code for
            detecting fires is mostly written in Python and available{' '}
            <a href="https://github.com/open-climate-tech/firecam">here</a>. The frontend code for
            displaying and cheking potential wildfires is mostly written in Javascript and available{' '}
            <a href="https://github.com/open-climate-tech/checkfire">here</a>.
          </p>
        </div>
      </div>

      <h1 className="w3-padding-32 w3-row-padding" id="about">About</h1>
      <div className="w3-row-padding w3-padding-64 w3-container w3-light-grey">
        <div className="w3-content">
          <p>
            Open Climate Tech, Inc. is a 501c3 non-profit organization that was formally founded in
            2020. Although technology alone can&apos;t fix all the problems made worse by climate
            change, we believe technology can help mitigate some of the adverse effects. The projects
            supported by this organization are developed by volunteers, and we welcome enthusiastic
            contributors interested in joining existing projects or starting new projects. We believe
            that open sourcing the technology helps collaboration with other groups and encourages
            volunteers. All code should have an open source license.
          </p>
        </div>
      </div>

      <h1 className="w3-padding-32 w3-row-padding" id="contact">Contact</h1>
      <div className="w3-row-padding w3-padding-64 w3-container w3-light-grey">
        <div className="w3-content">
          <p>
            Email{' '}
            {'info' + '@' + 'openclimatetech.org'}{' '}
            if you have any questions, suggestions, or would like to collaborate.
          </p>
        </div>
      </div>
    </div>
  );
}
